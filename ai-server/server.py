"""
AI Server for Real-time Voice Cloning using Coqui XTTS v2
- POST /enroll/{user_id}: Voice enrollment with DeepFilterNet noise reduction
- WebSocket /ws/tts/{user_id}: Real-time TTS streaming

Version 1.3.0 - Simplified & Bug Fixed:
- Fixed DeepFilterNet tensor conversion bug
- Removed unnecessary lowpass filter (XTTS 24kHz output is already clean)
- Use XTTS default parameters (they're well-tuned by Coqui team)
"""

import os
import tempfile
from typing import Dict, Optional, Tuple, Any
from contextlib import asynccontextmanager

import torch
import numpy as np
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from loguru import logger

# TTS import
from TTS.api import TTS

# DeepFilterNet import
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
    logger.warning(f"DeepFilterNet OSError (missing system library?): {e}")
except Exception as e:
    logger.warning(f"DeepFilterNet import failed with {type(e).__name__}: {e}")

# ===========================================
# Configuration
# ===========================================
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE_XTTS = 24000  # XTTS v2 native sample rate
SAMPLE_RATE_DF = 48000    # DeepFilterNet requires 48kHz

# ===========================================
# Global Storage
# ===========================================
tts_model: Optional[TTS] = None
user_latents: Dict[str, dict] = {}

# DeepFilterNet global state
df_model: Optional[Any] = None
df_state: Optional[Any] = None


# ===========================================
# Audio Processing Utilities
# ===========================================
class AudioProcessor:
    """Audio processing for enrollment"""

    @staticmethod
    def resample_audio(
        audio: np.ndarray,
        orig_sr: int,
        target_sr: int
    ) -> np.ndarray:
        """Resample audio using librosa with high quality"""
        if orig_sr == target_sr:
            return audio

        logger.debug(f"Resampling {orig_sr}Hz -> {target_sr}Hz")
        return librosa.resample(
            audio,
            orig_sr=orig_sr,
            target_sr=target_sr,
            res_type="kaiser_best"
        )

    @staticmethod
    def enhance_with_deepfilter(
        audio: np.ndarray,
        sample_rate: int
    ) -> Tuple[np.ndarray, int]:
        """
        Apply DeepFilterNet noise reduction.

        Pipeline:
        1. Convert to torch.Tensor (FIXED: DeepFilterNet expects Tensor)
        2. Resample to 48kHz
        3. Apply DeepFilterNet
        4. Resample back to 24kHz
        5. Convert back to numpy
        """
        global df_model, df_state

        if not DEEPFILTERNET_AVAILABLE or df_model is None:
            logger.warning("DeepFilterNet not available, returning raw audio")
            if sample_rate != SAMPLE_RATE_XTTS:
                audio = AudioProcessor.resample_audio(audio, sample_rate, SAMPLE_RATE_XTTS)
            return audio.astype(np.float32), SAMPLE_RATE_XTTS

        try:
            # Ensure float32 numpy array
            audio = audio.astype(np.float32)

            # Resample to 48kHz for DeepFilterNet
            if sample_rate != SAMPLE_RATE_DF:
                audio_48k = AudioProcessor.resample_audio(audio, sample_rate, SAMPLE_RATE_DF)
            else:
                audio_48k = audio

            # FIXED: Convert to torch.Tensor for DeepFilterNet
            audio_tensor = torch.from_numpy(audio_48k).unsqueeze(0)  # [1, samples]

            # Apply DeepFilterNet
            logger.debug("Applying DeepFilterNet...")
            enhanced_tensor = df_enhance(df_model, df_state, audio_tensor)

            # Convert back to numpy
            if isinstance(enhanced_tensor, torch.Tensor):
                enhanced_48k = enhanced_tensor.squeeze().numpy()
            else:
                enhanced_48k = np.array(enhanced_tensor)

            # Resample to XTTS rate (24kHz)
            if SAMPLE_RATE_DF != SAMPLE_RATE_XTTS:
                enhanced = AudioProcessor.resample_audio(enhanced_48k, SAMPLE_RATE_DF, SAMPLE_RATE_XTTS)
            else:
                enhanced = enhanced_48k

            logger.info("DeepFilterNet enhancement successful!")
            return enhanced.astype(np.float32), SAMPLE_RATE_XTTS

        except Exception as e:
            logger.error(f"DeepFilterNet enhancement failed: {e}. Using raw audio.")
            # Fallback: just resample
            if sample_rate != SAMPLE_RATE_XTTS:
                audio = AudioProcessor.resample_audio(audio, sample_rate, SAMPLE_RATE_XTTS)
            return audio.astype(np.float32), SAMPLE_RATE_XTTS

    @staticmethod
    def load_audio(file_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file"""
        try:
            audio, sr = librosa.load(file_path, sr=None, mono=True)
            return audio.astype(np.float32), sr
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            raise


# ===========================================
# Lifespan
# ===========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup"""
    global tts_model, df_model, df_state

    logger.info("=" * 50)
    logger.info("EUM AI Server v1.3.0 (Simplified)")
    logger.info(f"Device: {DEVICE}")
    logger.info("=" * 50)

    # Load XTTS v2
    logger.info(f"Loading XTTS v2 model...")
    try:
        tts_model = TTS(MODEL_NAME).to(DEVICE)
        logger.info("XTTS v2 loaded!")
    except Exception as e:
        logger.error(f"Failed to load TTS: {e}")
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

    yield

    # Cleanup
    logger.info("Shutting down...")
    torch.cuda.empty_cache()


# ===========================================
# FastAPI App
# ===========================================
app = FastAPI(
    title="EUM AI Server",
    description="Real-time Voice Cloning TTS",
    version="1.3.0",
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
    enhanced: bool = False


# ===========================================
# Endpoints
# ===========================================
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": tts_model is not None,
        "deepfilternet_loaded": df_model is not None,
        "device": DEVICE,
        "enrolled_users": list(user_latents.keys())
    }


@app.post("/enroll/{user_id}", response_model=EnrollResponse)
async def enroll_voice(user_id: str, audio: UploadFile = File(...)):
    """Enroll user voice with optional DeepFilterNet processing"""
    if tts_model is None:
        raise HTTPException(status_code=503, detail="TTS model not loaded")

    logger.info(f"Enrolling voice for user: {user_id}")

    temp_audio_path = None
    enhanced_audio_path = None
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
        logger.info(f"Loaded audio: {len(raw_audio)} samples @ {orig_sr}Hz ({duration:.2f}s)")

        # Apply DeepFilterNet if available
        if df_model is not None:
            logger.info("Applying DeepFilterNet noise reduction...")
            processed_audio, processed_sr = AudioProcessor.enhance_with_deepfilter(raw_audio, orig_sr)
            enhanced_applied = True
        else:
            # Just resample
            if orig_sr != SAMPLE_RATE_XTTS:
                processed_audio = AudioProcessor.resample_audio(raw_audio, orig_sr, SAMPLE_RATE_XTTS)
            else:
                processed_audio = raw_audio
            processed_sr = SAMPLE_RATE_XTTS

        logger.info(f"Processed audio: {len(processed_audio)} samples @ {processed_sr}Hz")

        # Save for XTTS
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            sf.write(f.name, processed_audio, processed_sr)
            enhanced_audio_path = f.name

        # Extract speaker latents
        logger.info("Extracting speaker latents...")
        synthesizer = tts_model.synthesizer
        gpt_cond_latent, speaker_embedding = synthesizer.tts_model.get_conditioning_latents(
            audio_path=enhanced_audio_path
        )

        user_latents[user_id] = {
            "gpt_cond_latent": gpt_cond_latent,
            "speaker_embedding": speaker_embedding
        }

        logger.info(f"Enrolled user: {user_id} (enhanced={enhanced_applied})")

        return EnrollResponse(
            success=True,
            message=f"Voice enrolled for {user_id}",
            user_id=user_id,
            enhanced=enhanced_applied
        )

    except Exception as e:
        logger.error(f"Enrollment failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in [temp_audio_path, enhanced_audio_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass


@app.websocket("/ws/tts/{user_id}")
async def websocket_tts(websocket: WebSocket, user_id: str):
    """
    Real-time TTS streaming.

    Uses XTTS default parameters - they're already well-tuned.
    No post-processing filters - XTTS output is already clean at 24kHz.
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: {user_id}")

    if user_id not in user_latents:
        await websocket.send_json({"error": "User not enrolled"})
        await websocket.close(code=4001)
        return

    if tts_model is None:
        await websocket.send_json({"error": "Model not loaded"})
        await websocket.close(code=4002)
        return

    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "")
            language = data.get("language", "ko")

            if not text:
                await websocket.send_json({"error": "Empty text"})
                continue

            logger.info(f"TTS: user={user_id}, lang={language}, text={text[:50]}...")

            try:
                latents = user_latents[user_id]
                synthesizer = tts_model.synthesizer

                # Use XTTS with DEFAULT parameters
                # The Coqui team has already tuned these well
                chunks = synthesizer.tts_model.inference_stream(
                    text=text,
                    language=language,
                    gpt_cond_latent=latents["gpt_cond_latent"],
                    speaker_embedding=latents["speaker_embedding"],
                    stream_chunk_size=20,
                    enable_text_splitting=True
                    # Let XTTS use its default temperature, repetition_penalty, etc.
                )

                # Send audio chunks directly - no post-processing
                for chunk in chunks:
                    if chunk is not None:
                        audio_float32 = chunk.cpu().numpy().astype(np.float32)
                        await websocket.send_bytes(audio_float32.tobytes())

                await websocket.send_json({"status": "complete"})

            except Exception as e:
                logger.error(f"TTS error: {e}")
                await websocket.send_json({"error": str(e)})

    except WebSocketDisconnect:
        logger.info(f"Disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=4000)


@app.delete("/enroll/{user_id}")
async def delete_enrollment(user_id: str):
    if user_id not in user_latents:
        raise HTTPException(status_code=404, detail="User not enrolled")

    del user_latents[user_id]
    logger.info(f"Deleted: {user_id}")
    return {"success": True}


# ===========================================
# Main
# ===========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
