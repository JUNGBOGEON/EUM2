"""
AI Server for Real-time Voice Cloning using OpenVoice V2
- POST /enroll/{user_id}: Voice enrollment with DeepFilterNet noise reduction
- POST /enroll-url/{user_id}: Voice enrollment from S3 presigned URL
- WebSocket /ws/tts/{user_id}: Real-time TTS streaming
- GET /health: Health check

Version 2.0.0 - OpenVoice V2 Migration:
- MeloTTS for base TTS (Korean, English, Japanese, Chinese)
- ToneColorConverter for voice cloning
- S3 integration for embedding storage/loading
- Improved quality for all 4 languages
"""

import os
import re
import tempfile
import asyncio
from typing import Dict, Optional, Tuple, Any, List
from contextlib import asynccontextmanager

import torch
import numpy as np
import librosa
import soundfile as sf
import requests
import boto3
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from loguru import logger

# ===========================================
# Configuration
# ===========================================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE_OUTPUT = 24000  # Output sample rate
SAMPLE_RATE_DF = 48000      # DeepFilterNet requires 48kHz

# S3 Configuration
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "eum2-voice-embeddings")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

# Paths
CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "checkpoints_v2")
USER_EMBEDDINGS_DIR = os.path.join(os.path.dirname(__file__), "user_embeddings")

# Create directories
os.makedirs(USER_EMBEDDINGS_DIR, exist_ok=True)

# ===========================================
# DeepFilterNet Import
# ===========================================
DEEPFILTERNET_AVAILABLE = False
df_enhance = None
df_init_df = None

try:
    from df import enhance as df_enhance, init_df as df_init_df
    DEEPFILTERNET_AVAILABLE = True
    logger.info("DeepFilterNet imported successfully!")
except ImportError as e:
    logger.warning(f"DeepFilterNet ImportError: {e}")
except OSError as e:
    logger.warning(f"DeepFilterNet OSError: {e}")
except Exception as e:
    logger.warning(f"DeepFilterNet import failed: {e}")

# ===========================================
# OpenVoice V2 Imports
# ===========================================
try:
    from melo.api import TTS as MeloTTS
    from openvoice import se_extractor
    from openvoice.api import ToneColorConverter
    OPENVOICE_AVAILABLE = True
    logger.info("OpenVoice V2 imported successfully!")
except ImportError as e:
    logger.error(f"OpenVoice V2 import failed: {e}")
    OPENVOICE_AVAILABLE = False

# ===========================================
# Global Storage
# ===========================================
# DeepFilterNet
df_model: Optional[Any] = None
df_state: Optional[Any] = None

# OpenVoice V2 Models
tone_color_converter: Optional[ToneColorConverter] = None
melo_models: Dict[str, MeloTTS] = {}  # Language -> MeloTTS model
source_embeddings: Dict[str, torch.Tensor] = {}  # Language -> source speaker embedding

# User embeddings cache
user_embeddings_cache: Dict[str, torch.Tensor] = {}

# S3 Client
s3_client: Optional[Any] = None

# Language configuration
LANGUAGE_CONFIG = {
    "ko": {"melo_lang": "KR", "speaker_key": "KR", "speaker_id": 0},
    "en": {"melo_lang": "EN", "speaker_key": "EN-US", "speaker_id": 0},
    "ja": {"melo_lang": "JP", "speaker_key": "JP", "speaker_id": 0},
    "zh": {"melo_lang": "ZH", "speaker_key": "ZH", "speaker_id": 0},
}


# ===========================================
# Audio Processing Utilities
# ===========================================
class AudioProcessor:
    """Audio processing utilities"""

    @staticmethod
    def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
        """Resample audio using librosa"""
        if orig_sr == target_sr:
            return audio
        logger.debug(f"Resampling {orig_sr}Hz -> {target_sr}Hz")
        return librosa.resample(audio, orig_sr=orig_sr, target_sr=target_sr, res_type="kaiser_best")

    @staticmethod
    def enhance_with_deepfilter(audio: np.ndarray, sample_rate: int) -> Tuple[np.ndarray, int]:
        """Apply DeepFilterNet noise reduction"""
        global df_model, df_state

        if not DEEPFILTERNET_AVAILABLE or df_model is None:
            logger.warning("DeepFilterNet not available")
            return audio.astype(np.float32), sample_rate

        try:
            audio = audio.astype(np.float32)

            # Resample to 48kHz for DeepFilterNet
            if sample_rate != SAMPLE_RATE_DF:
                audio_48k = AudioProcessor.resample_audio(audio, sample_rate, SAMPLE_RATE_DF)
            else:
                audio_48k = audio

            # Convert to torch.Tensor
            audio_tensor = torch.from_numpy(audio_48k).unsqueeze(0)

            # Apply DeepFilterNet
            logger.debug("Applying DeepFilterNet...")
            enhanced_tensor = df_enhance(df_model, df_state, audio_tensor)

            # Convert back to numpy
            if isinstance(enhanced_tensor, torch.Tensor):
                enhanced_48k = enhanced_tensor.squeeze().numpy()
            else:
                enhanced_48k = np.array(enhanced_tensor)

            logger.info("DeepFilterNet enhancement successful!")
            return enhanced_48k.astype(np.float32), SAMPLE_RATE_DF

        except Exception as e:
            logger.error(f"DeepFilterNet failed: {e}")
            return audio.astype(np.float32), sample_rate

    @staticmethod
    def load_audio(file_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file"""
        audio, sr = librosa.load(file_path, sr=None, mono=True)
        return audio.astype(np.float32), sr


# ===========================================
# S3 Embedding Loader
# ===========================================
class S3EmbeddingManager:
    """S3-based speaker embedding management"""

    def __init__(self, bucket_name: str, region: str = "ap-northeast-2"):
        self.bucket = bucket_name
        self.s3 = boto3.client('s3', region_name=region)

    def upload_embedding(self, user_id: str, embedding: torch.Tensor) -> str:
        """Upload embedding to S3"""
        s3_key = f"voice-embeddings/{user_id}.pth"
        local_path = f"/tmp/{user_id}_embedding.pth"

        try:
            torch.save(embedding.cpu(), local_path)
            self.s3.upload_file(local_path, self.bucket, s3_key)
            logger.info(f"Uploaded embedding to S3: {s3_key}")
            return s3_key
        finally:
            if os.path.exists(local_path):
                os.unlink(local_path)

    def download_embedding(self, user_id: str, s3_key: str) -> Optional[torch.Tensor]:
        """Download embedding from S3"""
        local_path = f"/tmp/{user_id}_embedding.pth"

        try:
            self.s3.download_file(self.bucket, s3_key, local_path)
            embedding = torch.load(local_path, map_location=DEVICE)
            logger.info(f"Downloaded embedding from S3: {s3_key}")
            return embedding
        except Exception as e:
            logger.error(f"Failed to download embedding: {e}")
            return None
        finally:
            if os.path.exists(local_path):
                os.unlink(local_path)

    def delete_embedding(self, s3_key: str) -> bool:
        """Delete embedding from S3"""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=s3_key)
            logger.info(f"Deleted embedding from S3: {s3_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete embedding: {e}")
            return False


# Global S3 manager
s3_manager: Optional[S3EmbeddingManager] = None


# ===========================================
# Model Manager
# ===========================================
class ModelManager:
    """OpenVoice V2 model management"""

    @staticmethod
    def load_tone_converter() -> ToneColorConverter:
        """Load ToneColorConverter"""
        ckpt_path = os.path.join(CHECKPOINT_DIR, "converter")
        config_path = os.path.join(ckpt_path, "config.json")

        converter = ToneColorConverter(config_path, device=DEVICE)
        converter.load_ckpt(os.path.join(ckpt_path, "checkpoint.pth"))
        logger.info("ToneColorConverter loaded!")
        return converter

    @staticmethod
    def get_melo_model(language: str) -> MeloTTS:
        """Get or load MeloTTS model for language (lazy loading)"""
        global melo_models

        if language not in LANGUAGE_CONFIG:
            raise ValueError(f"Unsupported language: {language}")

        if language not in melo_models:
            config = LANGUAGE_CONFIG[language]
            logger.info(f"Loading MeloTTS for {language}...")
            melo_models[language] = MeloTTS(language=config["melo_lang"], device=DEVICE)
            logger.info(f"MeloTTS loaded for {language}")

        return melo_models[language]

    @staticmethod
    def get_source_embedding(language: str) -> torch.Tensor:
        """Get source speaker embedding for language"""
        global source_embeddings, tone_color_converter

        if language not in LANGUAGE_CONFIG:
            raise ValueError(f"Unsupported language: {language}")

        if language not in source_embeddings:
            config = LANGUAGE_CONFIG[language]
            se_path = os.path.join(
                CHECKPOINT_DIR,
                "base_speakers",
                "ses",
                f"{config['speaker_key'].lower()}.pth"
            )

            if os.path.exists(se_path):
                source_embeddings[language] = torch.load(se_path, map_location=DEVICE)
                logger.info(f"Loaded source embedding for {language}")
            else:
                # Generate from default speaker
                logger.warning(f"Source embedding not found for {language}, generating...")
                melo = ModelManager.get_melo_model(language)

                # Generate sample audio
                temp_path = f"/tmp/source_{language}.wav"
                sample_text = {
                    "ko": "안녕하세요",
                    "en": "Hello",
                    "ja": "こんにちは",
                    "zh": "你好"
                }.get(language, "Hello")

                melo.tts_to_file(sample_text, config["speaker_id"], temp_path)

                # Extract embedding (get_se returns tuple)
                se_result = se_extractor.get_se(
                    temp_path, tone_color_converter, vad=True
                )
                source_embeddings[language] = se_result[0] if isinstance(se_result, tuple) else se_result

                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        return source_embeddings[language]


# ===========================================
# TTS Pipeline
# ===========================================
class TTSPipeline:
    """MeloTTS + ToneColorConverter pipeline"""

    @staticmethod
    def split_into_sentences(text: str, language: str) -> List[str]:
        """Split text into sentences for streaming"""
        # Language-specific sentence splitters
        if language in ["ko", "ja", "zh"]:
            # Asian languages: split by punctuation
            sentences = re.split(r'(?<=[。！？.!?])\s*', text)
        else:
            # Western languages
            sentences = re.split(r'(?<=[.!?])\s+', text)

        # Filter empty strings and strip whitespace
        return [s.strip() for s in sentences if s.strip()]

    @staticmethod
    async def synthesize_streaming(
        text: str,
        language: str,
        target_se: torch.Tensor,
        websocket: WebSocket
    ):
        """
        Streaming TTS with voice cloning.

        Pipeline for each sentence:
        1. MeloTTS generates base audio
        2. ToneColorConverter applies target voice
        3. Send audio chunk via WebSocket
        """
        global tone_color_converter

        sentences = TTSPipeline.split_into_sentences(text, language)
        if not sentences:
            sentences = [text]

        config = LANGUAGE_CONFIG.get(language, LANGUAGE_CONFIG["en"])
        melo = ModelManager.get_melo_model(language)
        source_se = ModelManager.get_source_embedding(language)

        for i, sentence in enumerate(sentences):
            if not sentence:
                continue

            temp_base = f"/tmp/tts_base_{i}.wav"
            temp_out = f"/tmp/tts_out_{i}.wav"

            try:
                # 1. Generate base audio with MeloTTS
                logger.debug(f"MeloTTS generating: {sentence[:30]}...")
                melo.tts_to_file(sentence, config["speaker_id"], temp_base)

                # 2. Apply voice cloning with ToneColorConverter
                logger.debug("Applying ToneColorConverter...")
                tone_color_converter.convert(
                    audio_src_path=temp_base,
                    src_se=source_se,
                    tgt_se=target_se,
                    output_path=temp_out,
                    message="@EUM"  # Watermark
                )

                # 3. Load and send audio
                audio, sr = librosa.load(temp_out, sr=SAMPLE_RATE_OUTPUT)
                audio_bytes = audio.astype(np.float32).tobytes()
                await websocket.send_bytes(audio_bytes)

                logger.debug(f"Sent chunk {i+1}/{len(sentences)}")

            except Exception as e:
                logger.error(f"Error processing sentence {i}: {e}")
                continue

            finally:
                # Cleanup temp files
                for path in [temp_base, temp_out]:
                    if os.path.exists(path):
                        os.unlink(path)

        await websocket.send_json({"status": "complete"})

    @staticmethod
    def synthesize_to_file(
        text: str,
        language: str,
        target_se: torch.Tensor,
        output_path: str
    ) -> str:
        """
        Non-streaming TTS to file.
        Returns the output file path.
        """
        global tone_color_converter

        config = LANGUAGE_CONFIG.get(language, LANGUAGE_CONFIG["en"])
        melo = ModelManager.get_melo_model(language)
        source_se = ModelManager.get_source_embedding(language)

        temp_base = f"/tmp/tts_base_full.wav"

        try:
            # Generate base audio
            melo.tts_to_file(text, config["speaker_id"], temp_base)

            # Apply voice cloning
            tone_color_converter.convert(
                audio_src_path=temp_base,
                src_se=source_se,
                tgt_se=target_se,
                output_path=output_path,
                message="@EUM"
            )

            return output_path

        finally:
            if os.path.exists(temp_base):
                os.unlink(temp_base)


# ===========================================
# Speaker Embedding Manager
# ===========================================
class SpeakerEmbeddingManager:
    """User speaker embedding management"""

    @staticmethod
    async def enroll_user(user_id: str, audio_path: str, upload_to_s3: bool = True) -> Tuple[torch.Tensor, Optional[str]]:
        """
        Enroll user voice and extract speaker embedding.

        Returns: (embedding, s3_key or None)
        """
        global tone_color_converter, user_embeddings_cache, s3_manager

        # Extract speaker embedding using se_extractor
        # Note: get_se() returns (speaker_embedding, audio_name) tuple
        logger.info(f"Extracting speaker embedding for {user_id}...")
        se_result = se_extractor.get_se(audio_path, tone_color_converter, vad=True)

        # Handle tuple return value (embedding, audio_name)
        if isinstance(se_result, tuple):
            target_se = se_result[0]
        else:
            target_se = se_result

        # Cache in memory
        user_embeddings_cache[user_id] = target_se

        # Save locally
        local_path = os.path.join(USER_EMBEDDINGS_DIR, f"{user_id}.pth")
        torch.save(target_se.cpu(), local_path)
        logger.info(f"Saved embedding locally: {local_path}")

        # Upload to S3 if enabled
        s3_key = None
        if upload_to_s3 and s3_manager:
            s3_key = s3_manager.upload_embedding(user_id, target_se)

        return target_se, s3_key

    @staticmethod
    def get_embedding(user_id: str, s3_key: Optional[str] = None) -> Optional[torch.Tensor]:
        """
        Get user embedding (memory cache -> local file -> S3)
        """
        global user_embeddings_cache, s3_manager

        # 1. Check memory cache
        if user_id in user_embeddings_cache:
            return user_embeddings_cache[user_id]

        # 2. Check local file
        local_path = os.path.join(USER_EMBEDDINGS_DIR, f"{user_id}.pth")
        if os.path.exists(local_path):
            embedding = torch.load(local_path, map_location=DEVICE)
            user_embeddings_cache[user_id] = embedding
            logger.info(f"Loaded embedding from local: {local_path}")
            return embedding

        # 3. Try S3
        if s3_key and s3_manager:
            embedding = s3_manager.download_embedding(user_id, s3_key)
            if embedding is not None:
                user_embeddings_cache[user_id] = embedding
                # Save locally for next time
                torch.save(embedding.cpu(), local_path)
                return embedding

        return None

    @staticmethod
    def delete_user(user_id: str, s3_key: Optional[str] = None) -> bool:
        """Delete user embedding from all storage"""
        global user_embeddings_cache, s3_manager

        # Remove from cache
        user_embeddings_cache.pop(user_id, None)

        # Remove local file
        local_path = os.path.join(USER_EMBEDDINGS_DIR, f"{user_id}.pth")
        if os.path.exists(local_path):
            os.unlink(local_path)

        # Remove from S3
        if s3_key and s3_manager:
            s3_manager.delete_embedding(s3_key)

        logger.info(f"Deleted embedding for {user_id}")
        return True


# ===========================================
# Lifespan
# ===========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup"""
    global tone_color_converter, df_model, df_state, s3_manager

    logger.info("=" * 60)
    logger.info("EUM AI Server v2.0.0 (OpenVoice V2)")
    logger.info(f"Device: {DEVICE}")
    logger.info(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    logger.info("=" * 60)

    # Check OpenVoice availability
    if not OPENVOICE_AVAILABLE:
        logger.error("OpenVoice V2 not available! Install with:")
        logger.error("  pip install -e ./_openvoice")
        logger.error("  pip install git+https://github.com/myshell-ai/MeloTTS.git")
        raise RuntimeError("OpenVoice V2 not installed")

    # Load ToneColorConverter
    logger.info("Loading ToneColorConverter...")
    try:
        tone_color_converter = ModelManager.load_tone_converter()
    except Exception as e:
        logger.error(f"Failed to load ToneColorConverter: {e}")
        logger.error("Make sure checkpoints_v2/ directory exists with model files")
        raise

    # Load DeepFilterNet
    if DEEPFILTERNET_AVAILABLE:
        logger.info("Loading DeepFilterNet...")
        try:
            df_model, df_state, _ = df_init_df()
            logger.info("DeepFilterNet loaded!")
        except Exception as e:
            logger.warning(f"DeepFilterNet load failed: {e}")
            df_model = None
            df_state = None

    # Initialize S3 manager
    logger.info("Initializing S3 manager...")
    try:
        s3_manager = S3EmbeddingManager(S3_BUCKET_NAME, AWS_REGION)
        logger.info(f"S3 manager initialized: {S3_BUCKET_NAME}")
    except Exception as e:
        logger.warning(f"S3 manager init failed: {e}")
        s3_manager = None

    # Pre-load Korean MeloTTS (most commonly used)
    logger.info("Pre-loading Korean MeloTTS...")
    try:
        ModelManager.get_melo_model("ko")
    except Exception as e:
        logger.warning(f"Failed to pre-load Korean MeloTTS: {e}")

    logger.info("=" * 60)
    logger.info("Server ready!")
    logger.info("=" * 60)

    yield

    # Cleanup
    logger.info("Shutting down...")
    torch.cuda.empty_cache()


# ===========================================
# FastAPI App
# ===========================================
app = FastAPI(
    title="EUM AI Server",
    description="Real-time Voice Cloning TTS with OpenVoice V2",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================
# Models
# ===========================================
class EnrollResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    s3_key: Optional[str] = None
    enhanced: bool = False


class EnrollUrlRequest(BaseModel):
    audio_url: str


# ===========================================
# Endpoints
# ===========================================
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "model": "OpenVoice V2",
        "tone_converter_loaded": tone_color_converter is not None,
        "deepfilternet_loaded": df_model is not None,
        "melo_models_loaded": list(melo_models.keys()),
        "device": DEVICE,
        "enrolled_users": list(user_embeddings_cache.keys()),
        "s3_enabled": s3_manager is not None,
        "supported_languages": list(LANGUAGE_CONFIG.keys())
    }


@app.post("/enroll/{user_id}", response_model=EnrollResponse)
async def enroll_voice(user_id: str, audio: UploadFile = File(...)):
    """
    Enroll user voice from uploaded file.
    Applies DeepFilterNet noise reduction if available.
    """
    if tone_color_converter is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    logger.info(f"Enrolling voice for user: {user_id}")

    temp_audio_path = None
    processed_audio_path = None
    enhanced_applied = False

    try:
        # Save uploaded audio
        suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            content = await audio.read()
            f.write(content)
            temp_audio_path = f.name

        # Load audio
        logger.info(f"Loading audio from: {temp_audio_path}")
        raw_audio, orig_sr = AudioProcessor.load_audio(temp_audio_path)
        duration = len(raw_audio) / orig_sr
        logger.info(f"Loaded: {duration:.2f}s @ {orig_sr}Hz")

        # Apply DeepFilterNet if available
        if df_model is not None:
            logger.info("Applying DeepFilterNet noise reduction...")
            processed_audio, processed_sr = AudioProcessor.enhance_with_deepfilter(raw_audio, orig_sr)
            enhanced_applied = True
        else:
            processed_audio = raw_audio
            processed_sr = orig_sr

        # Save processed audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            sf.write(f.name, processed_audio, processed_sr)
            processed_audio_path = f.name

        # Extract speaker embedding
        target_se, s3_key = await SpeakerEmbeddingManager.enroll_user(
            user_id, processed_audio_path, upload_to_s3=True
        )

        logger.info(f"Enrolled user: {user_id} (enhanced={enhanced_applied}, s3_key={s3_key})")

        return EnrollResponse(
            success=True,
            message=f"Voice enrolled for {user_id}",
            user_id=user_id,
            s3_key=s3_key,
            enhanced=enhanced_applied
        )

    except Exception as e:
        logger.error(f"Enrollment failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in [temp_audio_path, processed_audio_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass


@app.post("/enroll-url/{user_id}", response_model=EnrollResponse)
async def enroll_voice_from_url(user_id: str, request: EnrollUrlRequest):
    """
    Enroll user voice from S3 presigned URL.
    Used by backend to enroll users without direct file upload.
    """
    if tone_color_converter is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    logger.info(f"Enrolling voice from URL for user: {user_id}")

    temp_audio_path = None
    processed_audio_path = None
    enhanced_applied = False

    try:
        # Download audio from URL
        response = requests.get(request.audio_url, timeout=30)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(response.content)
            temp_audio_path = f.name

        # Load audio
        raw_audio, orig_sr = AudioProcessor.load_audio(temp_audio_path)
        duration = len(raw_audio) / orig_sr
        logger.info(f"Downloaded and loaded: {duration:.2f}s @ {orig_sr}Hz")

        # Apply DeepFilterNet if available
        if df_model is not None:
            logger.info("Applying DeepFilterNet noise reduction...")
            processed_audio, processed_sr = AudioProcessor.enhance_with_deepfilter(raw_audio, orig_sr)
            enhanced_applied = True
        else:
            processed_audio = raw_audio
            processed_sr = orig_sr

        # Save processed audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            sf.write(f.name, processed_audio, processed_sr)
            processed_audio_path = f.name

        # Extract speaker embedding
        target_se, s3_key = await SpeakerEmbeddingManager.enroll_user(
            user_id, processed_audio_path, upload_to_s3=True
        )

        logger.info(f"Enrolled user from URL: {user_id} (enhanced={enhanced_applied})")

        return EnrollResponse(
            success=True,
            message=f"Voice enrolled for {user_id}",
            user_id=user_id,
            s3_key=s3_key,
            enhanced=enhanced_applied
        )

    except requests.RequestException as e:
        logger.error(f"Failed to download audio: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download audio: {e}")
    except Exception as e:
        logger.error(f"Enrollment failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in [temp_audio_path, processed_audio_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass


@app.websocket("/ws/tts/{user_id}")
async def websocket_tts(websocket: WebSocket, user_id: str):
    """
    Real-time TTS streaming with voice cloning.

    Expects JSON: {"text": "...", "language": "ko", "s3_key": "optional"}
    Sends: Binary audio chunks (float32) + {"status": "complete"}
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: {user_id}")

    # Get user embedding
    target_se = SpeakerEmbeddingManager.get_embedding(user_id)

    if target_se is None:
        await websocket.send_json({"error": "User not enrolled"})
        await websocket.close(code=4001)
        return

    if tone_color_converter is None:
        await websocket.send_json({"error": "Model not loaded"})
        await websocket.close(code=4002)
        return

    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "")
            language = data.get("language", "ko")

            # Optional: load from S3 if s3_key provided
            s3_key = data.get("s3_key")
            if s3_key and target_se is None:
                target_se = SpeakerEmbeddingManager.get_embedding(user_id, s3_key)
                if target_se is None:
                    await websocket.send_json({"error": "Failed to load embedding"})
                    continue

            if not text:
                await websocket.send_json({"error": "Empty text"})
                continue

            if language not in LANGUAGE_CONFIG:
                await websocket.send_json({"error": f"Unsupported language: {language}"})
                continue

            logger.info(f"TTS: user={user_id}, lang={language}, text={text[:50]}...")

            try:
                await TTSPipeline.synthesize_streaming(
                    text=text,
                    language=language,
                    target_se=target_se,
                    websocket=websocket
                )
            except Exception as e:
                logger.error(f"TTS error: {e}")
                await websocket.send_json({"error": str(e)})

    except WebSocketDisconnect:
        logger.info(f"Disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=4000)


@app.delete("/enroll/{user_id}")
async def delete_enrollment(user_id: str, s3_key: Optional[str] = None):
    """Delete user enrollment"""
    if user_id not in user_embeddings_cache:
        # Check if exists locally
        local_path = os.path.join(USER_EMBEDDINGS_DIR, f"{user_id}.pth")
        if not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail="User not enrolled")

    SpeakerEmbeddingManager.delete_user(user_id, s3_key)
    logger.info(f"Deleted enrollment: {user_id}")

    return {"success": True, "message": f"Deleted enrollment for {user_id}"}


@app.post("/tts/file/{user_id}")
async def tts_to_file(
    user_id: str,
    text: str = Body(...),
    language: str = Body(default="ko"),
    s3_key: Optional[str] = Body(default=None)
):
    """
    Generate TTS to file and return the audio.
    Useful for non-streaming use cases like meeting summaries.
    """
    target_se = SpeakerEmbeddingManager.get_embedding(user_id, s3_key)

    if target_se is None:
        raise HTTPException(status_code=404, detail="User not enrolled")

    if language not in LANGUAGE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

    output_path = f"/tmp/tts_output_{user_id}.wav"

    try:
        TTSPipeline.synthesize_to_file(
            text=text,
            language=language,
            target_se=target_se,
            output_path=output_path
        )

        # Read and return audio
        audio, sr = librosa.load(output_path, sr=SAMPLE_RATE_OUTPUT)

        from fastapi.responses import Response
        audio_bytes = audio.astype(np.float32).tobytes()

        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename=tts_{user_id}.wav",
                "X-Sample-Rate": str(SAMPLE_RATE_OUTPUT)
            }
        )

    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


# ===========================================
# Main
# ===========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server_openvoice_v2:app", host="0.0.0.0", port=8000, reload=False)
