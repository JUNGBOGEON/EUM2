"""
AI Server for Real-time Voice Cloning using Coqui XTTS v2
- POST /enroll/{user_id}: Voice enrollment with DeepFilterNet noise reduction
- WebSocket /ws/tts/{user_id}: Real-time TTS streaming with optimized parameters

Hybrid Audio Processing Strategy:
- Enrollment: High-quality DeepFilterNet processing (48kHz) with kaiser_best resampling
- Streaming: Optimized XTTS parameters for clear pronunciation

Audio Quality Tuning (v1.2.0):
- LOWPASS_CUTOFF: 8000 → 18000 (preserve high frequencies for clarity)
- temperature: 0.3 (stable, focused pronunciation)
- repetition_penalty: 2.0 (natural flow, not slurred)
- length_penalty: 1.0 (standard)
"""

import os
import tempfile
from typing import Dict, Optional, Tuple, Any
from contextlib import asynccontextmanager

import torch
import torchaudio
import torchaudio.functional as F
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
# Note: Catch all exceptions, not just ImportError, to see the actual error
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
    # Common: missing libsndfile, libgomp, etc.
    logger.warning(f"DeepFilterNet OSError (missing system library?): {e}")
except Exception as e:
    # Catch-all for unexpected errors
    logger.warning(f"DeepFilterNet import failed with {type(e).__name__}: {e}")

# ===========================================
# Configuration
# ===========================================
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE_XTTS = 24000  # XTTS v2 sample rate
SAMPLE_RATE_DF = 48000    # DeepFilterNet requires 48kHz

# Audio Quality Settings (TUNED for clarity)
LOWPASS_CUTOFF = 18000    # High cutoff to preserve clarity (was 8000 - too aggressive)
LOWPASS_ENABLED = True    # Set to False to completely disable lowpass filter

# XTTS Generation Parameters (TUNED for clear pronunciation)
TTS_TEMPERATURE = 0.3           # Lower = more stable/focused (was 0.7 - too random)
TTS_REPETITION_PENALTY = 2.0    # Standard value (was 10.0 - destroyed flow)
TTS_LENGTH_PENALTY = 1.0        # Standard value
TTS_TOP_K = 50                  # Top-k sampling
TTS_TOP_P = 0.85                # Nucleus sampling threshold
TTS_STREAM_CHUNK_SIZE = 20      # Tokens per chunk

# Resampling Quality
RESAMPLE_QUALITY = "kaiser_best"  # High-quality resampling (options: kaiser_best, kaiser_fast, fft, polyphase)

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
    """Hybrid audio processing for enrollment and streaming"""

    @staticmethod
    def resample_audio(
        audio: np.ndarray,
        orig_sr: int,
        target_sr: int,
        high_quality: bool = True
    ) -> np.ndarray:
        """
        Resample audio using librosa with configurable quality.

        Args:
            audio: Input audio array
            orig_sr: Original sample rate
            target_sr: Target sample rate
            high_quality: If True, use kaiser_best for highest quality
        """
        if orig_sr == target_sr:
            return audio

        res_type = RESAMPLE_QUALITY if high_quality else "kaiser_fast"
        logger.debug(f"Resampling {orig_sr}Hz -> {target_sr}Hz (quality={res_type})")

        return librosa.resample(
            audio,
            orig_sr=orig_sr,
            target_sr=target_sr,
            res_type=res_type
        )

    @staticmethod
    def enhance_with_deepfilter(
        audio: np.ndarray,
        sample_rate: int
    ) -> Tuple[np.ndarray, int]:
        """
        Apply DeepFilterNet noise reduction with high-quality resampling.
        Returns enhanced audio at XTTS sample rate (24kHz).

        DeepFilterNet requires 48kHz input, so we:
        1. Upsample to 48kHz using kaiser_best
        2. Apply DeepFilterNet
        3. Downsample back to 24kHz using kaiser_best
        """
        global df_model, df_state

        if not DEEPFILTERNET_AVAILABLE or df_model is None:
            logger.warning("DeepFilterNet not available, returning raw audio")
            return audio, sample_rate

        try:
            # Ensure float32
            audio = audio.astype(np.float32)

            # Upsample to 48kHz for DeepFilterNet (high quality)
            if sample_rate != SAMPLE_RATE_DF:
                logger.debug(f"Upsampling {sample_rate}Hz -> {SAMPLE_RATE_DF}Hz for DeepFilterNet")
                audio_48k = AudioProcessor.resample_audio(
                    audio, sample_rate, SAMPLE_RATE_DF, high_quality=True
                )
            else:
                audio_48k = audio

            # Apply DeepFilterNet enhancement
            logger.debug("Applying DeepFilterNet noise reduction...")
            enhanced_48k = df_enhance(df_model, df_state, audio_48k)

            # Downsample to XTTS rate (24kHz) with high quality
            if SAMPLE_RATE_DF != SAMPLE_RATE_XTTS:
                logger.debug(f"Downsampling {SAMPLE_RATE_DF}Hz -> {SAMPLE_RATE_XTTS}Hz")
                enhanced = AudioProcessor.resample_audio(
                    enhanced_48k, SAMPLE_RATE_DF, SAMPLE_RATE_XTTS, high_quality=True
                )
            else:
                enhanced = enhanced_48k

            return enhanced.astype(np.float32), SAMPLE_RATE_XTTS

        except Exception as e:
            logger.error(f"DeepFilterNet enhancement failed: {e}. Using raw audio.")
            # Fallback: just resample to XTTS rate
            if sample_rate != SAMPLE_RATE_XTTS:
                audio = AudioProcessor.resample_audio(
                    audio, sample_rate, SAMPLE_RATE_XTTS, high_quality=True
                )
            return audio.astype(np.float32), SAMPLE_RATE_XTTS

    @staticmethod
    def apply_lowpass_filter(
        audio_tensor: torch.Tensor,
        sample_rate: int = SAMPLE_RATE_XTTS,
        cutoff_freq: int = LOWPASS_CUTOFF
    ) -> torch.Tensor:
        """
        Apply lightweight lowpass biquad filter.
        With cutoff at 18kHz, this preserves most audible frequencies
        while removing only ultrasonic artifacts.

        Note: Human hearing range is ~20Hz-20kHz, speech clarity needs up to ~16kHz.
        Setting cutoff to 18kHz preserves all speech frequencies.
        """
        if not LOWPASS_ENABLED or cutoff_freq <= 0:
            return audio_tensor

        # Skip filter if cutoff is at or above Nyquist frequency
        nyquist = sample_rate // 2
        if cutoff_freq >= nyquist:
            logger.debug(f"Lowpass cutoff {cutoff_freq}Hz >= Nyquist {nyquist}Hz, skipping filter")
            return audio_tensor

        try:
            # Ensure 2D tensor [channels, samples]
            if audio_tensor.dim() == 1:
                audio_tensor = audio_tensor.unsqueeze(0)

            # Apply lowpass biquad filter
            filtered = F.lowpass_biquad(
                audio_tensor,
                sample_rate=sample_rate,
                cutoff_freq=cutoff_freq,
                Q=0.707  # Butterworth response (flat passband)
            )

            return filtered.squeeze(0)

        except Exception as e:
            logger.warning(f"Lowpass filter failed: {e}. Returning original audio.")
            return audio_tensor.squeeze(0) if audio_tensor.dim() > 1 else audio_tensor

    @staticmethod
    def load_and_preprocess_audio(file_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file and return as numpy array with sample rate"""
        try:
            # Try loading with librosa (handles most formats)
            audio, sr = librosa.load(file_path, sr=None, mono=True)
            return audio.astype(np.float32), sr
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            raise


# ===========================================
# Lifespan (Startup/Shutdown)
# ===========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown"""
    global tts_model, df_model, df_state

    # Log configuration
    logger.info("=" * 50)
    logger.info("EUM AI Server Configuration:")
    logger.info(f"  Device: {DEVICE}")
    logger.info(f"  XTTS Sample Rate: {SAMPLE_RATE_XTTS}Hz")
    logger.info(f"  Lowpass Cutoff: {LOWPASS_CUTOFF}Hz (enabled={LOWPASS_ENABLED})")
    logger.info(f"  TTS Temperature: {TTS_TEMPERATURE}")
    logger.info(f"  TTS Repetition Penalty: {TTS_REPETITION_PENALTY}")
    logger.info(f"  TTS Length Penalty: {TTS_LENGTH_PENALTY}")
    logger.info(f"  Resample Quality: {RESAMPLE_QUALITY}")
    logger.info("=" * 50)

    # Load XTTS v2 model
    logger.info(f"Loading XTTS v2 model on {DEVICE}...")
    try:
        tts_model = TTS(MODEL_NAME).to(DEVICE)
        logger.info("XTTS v2 model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load TTS model: {e}")
        raise

    # Load DeepFilterNet model
    if DEEPFILTERNET_AVAILABLE:
        logger.info("Loading DeepFilterNet model...")
        try:
            df_model, df_state, _ = df_init_df()
            logger.info("DeepFilterNet model loaded successfully!")
        except Exception as e:
            logger.warning(f"Failed to load DeepFilterNet: {e}. Audio enhancement disabled.")
            df_model = None
            df_state = None
    else:
        logger.warning("DeepFilterNet not installed. Audio enhancement disabled.")

    yield

    # Cleanup
    logger.info("Shutting down AI server...")
    if tts_model is not None:
        del tts_model
    if df_model is not None:
        del df_model
        del df_state
    torch.cuda.empty_cache()


# ===========================================
# FastAPI App
# ===========================================
app = FastAPI(
    title="EUM AI Server",
    description="Real-time Voice Cloning TTS with Optimized Audio Quality",
    version="1.2.0",
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
# Pydantic Models
# ===========================================
class EnrollResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    enhanced: bool = False  # Whether DeepFilterNet was applied


class TTSRequest(BaseModel):
    text: str
    language: str = "ko"


# ===========================================
# Endpoints
# ===========================================
@app.get("/health")
async def health_check():
    """Health check endpoint with configuration info"""
    return {
        "status": "healthy",
        "model_loaded": tts_model is not None,
        "deepfilternet_loaded": df_model is not None,
        "device": DEVICE,
        "enrolled_users": list(user_latents.keys()),
        "config": {
            "lowpass_cutoff": LOWPASS_CUTOFF,
            "lowpass_enabled": LOWPASS_ENABLED,
            "temperature": TTS_TEMPERATURE,
            "repetition_penalty": TTS_REPETITION_PENALTY,
            "resample_quality": RESAMPLE_QUALITY
        }
    }


@app.post("/enroll/{user_id}", response_model=EnrollResponse)
async def enroll_voice(user_id: str, audio: UploadFile = File(...)):
    """
    Enroll a user's voice with high-quality DeepFilterNet processing.

    Processing Pipeline:
    1. Load uploaded audio
    2. Apply DeepFilterNet noise reduction (48kHz) with kaiser_best resampling
    3. Resample to 24kHz for XTTS with kaiser_best
    4. Extract speaker latents
    """
    if tts_model is None:
        raise HTTPException(status_code=503, detail="TTS model not loaded")

    logger.info(f"Enrolling voice for user: {user_id}")

    temp_audio_path = None
    enhanced_audio_path = None
    enhanced_applied = False

    try:
        # Save uploaded audio to temp file
        suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_audio_path = temp_file.name

        # Load and preprocess audio
        logger.info(f"Loading audio from: {temp_audio_path}")
        raw_audio, orig_sr = AudioProcessor.load_and_preprocess_audio(temp_audio_path)
        logger.info(f"Loaded audio: {len(raw_audio)} samples @ {orig_sr}Hz ({len(raw_audio)/orig_sr:.2f}s)")

        # Apply DeepFilterNet enhancement (high-quality processing)
        if df_model is not None:
            logger.info("Applying DeepFilterNet noise reduction (high-quality mode)...")
            processed_audio, processed_sr = AudioProcessor.enhance_with_deepfilter(
                raw_audio, orig_sr
            )
            enhanced_applied = True
            logger.info(f"Enhanced audio: {len(processed_audio)} samples @ {processed_sr}Hz")
        else:
            # Fallback: just resample to XTTS rate with high quality
            if orig_sr != SAMPLE_RATE_XTTS:
                processed_audio = AudioProcessor.resample_audio(
                    raw_audio, orig_sr, SAMPLE_RATE_XTTS, high_quality=True
                )
            else:
                processed_audio = raw_audio
            processed_sr = SAMPLE_RATE_XTTS
            logger.info("DeepFilterNet not available, using high-quality resampled audio")

        # Save enhanced audio to temp file for XTTS
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as enhanced_file:
            sf.write(enhanced_file.name, processed_audio, processed_sr)
            enhanced_audio_path = enhanced_file.name

        # Extract speaker latents using XTTS
        logger.info("Extracting speaker latents...")
        synthesizer = tts_model.synthesizer
        gpt_cond_latent, speaker_embedding = synthesizer.tts_model.get_conditioning_latents(
            audio_path=enhanced_audio_path
        )

        # Store latents in memory
        user_latents[user_id] = {
            "gpt_cond_latent": gpt_cond_latent,
            "speaker_embedding": speaker_embedding
        }

        logger.info(f"Successfully enrolled user: {user_id} (enhanced={enhanced_applied})")

        return EnrollResponse(
            success=True,
            message=f"Voice enrolled successfully for user {user_id}",
            user_id=user_id,
            enhanced=enhanced_applied
        )

    except Exception as e:
        logger.error(f"Failed to enroll voice for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Voice enrollment failed: {str(e)}")

    finally:
        # Cleanup temp files
        for path in [temp_audio_path, enhanced_audio_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass


@app.websocket("/ws/tts/{user_id}")
async def websocket_tts(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time TTS streaming with optimized parameters.

    Processing Pipeline:
    1. Generate audio chunks with XTTS (optimized parameters)
    2. Apply gentle lowpass filter (18kHz cutoff - preserves clarity)
    3. Send Float32 PCM bytes

    Generation Parameters (optimized for clear speech):
    - temperature: 0.3 (stable pronunciation)
    - repetition_penalty: 2.0 (natural flow)
    - length_penalty: 1.0 (standard)
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for TTS: user={user_id}")

    # Validate user enrollment
    if user_id not in user_latents:
        await websocket.send_json({
            "error": "User not enrolled",
            "message": f"Please enroll voice for user {user_id} first"
        })
        await websocket.close(code=4001)
        return

    if tts_model is None:
        await websocket.send_json({
            "error": "Model not loaded",
            "message": "TTS model is not available"
        })
        await websocket.close(code=4002)
        return

    try:
        while True:
            # Receive TTS request
            data = await websocket.receive_json()
            text = data.get("text", "")
            language = data.get("language", "ko")
            apply_filter = data.get("apply_filter", LOWPASS_ENABLED)

            # Optional: allow client to override parameters
            temperature = data.get("temperature", TTS_TEMPERATURE)
            repetition_penalty = data.get("repetition_penalty", TTS_REPETITION_PENALTY)

            if not text:
                await websocket.send_json({"error": "Empty text"})
                continue

            logger.info(
                f"TTS request: user={user_id}, lang={language}, "
                f"temp={temperature}, rep_penalty={repetition_penalty}, "
                f"filter={apply_filter}, text={text[:50]}..."
            )

            try:
                # Get user's speaker latents
                latents = user_latents[user_id]
                gpt_cond_latent = latents["gpt_cond_latent"]
                speaker_embedding = latents["speaker_embedding"]

                # Generate speech using streaming inference with OPTIMIZED parameters
                synthesizer = tts_model.synthesizer
                chunks = synthesizer.tts_model.inference_stream(
                    text=text,
                    language=language,
                    gpt_cond_latent=gpt_cond_latent,
                    speaker_embedding=speaker_embedding,
                    # === OPTIMIZED PARAMETERS ===
                    temperature=temperature,              # 0.3: Stable, focused pronunciation
                    repetition_penalty=repetition_penalty, # 2.0: Natural flow (not slurred)
                    length_penalty=TTS_LENGTH_PENALTY,    # 1.0: Standard
                    top_k=TTS_TOP_K,                      # 50: Top-k sampling
                    top_p=TTS_TOP_P,                      # 0.85: Nucleus sampling
                    # === STREAMING ===
                    stream_chunk_size=TTS_STREAM_CHUNK_SIZE,
                    enable_text_splitting=True
                )

                # Process and send audio chunks
                for chunk in chunks:
                    if chunk is not None:
                        # Apply gentle lowpass filter (18kHz preserves speech clarity)
                        if apply_filter:
                            filtered_chunk = AudioProcessor.apply_lowpass_filter(
                                chunk,
                                sample_rate=SAMPLE_RATE_XTTS,
                                cutoff_freq=LOWPASS_CUTOFF
                            )
                            audio_float32 = filtered_chunk.cpu().numpy().astype(np.float32)
                        else:
                            audio_float32 = chunk.cpu().numpy().astype(np.float32)

                        # Send raw Float32 PCM bytes
                        await websocket.send_bytes(audio_float32.tobytes())

                # Send end-of-stream marker
                await websocket.send_json({"status": "complete"})

            except Exception as e:
                logger.error(f"TTS generation error: {e}")
                await websocket.send_json({"error": str(e)})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        await websocket.close(code=4000)


@app.delete("/enroll/{user_id}")
async def delete_enrollment(user_id: str):
    """Delete a user's voice enrollment"""
    if user_id not in user_latents:
        raise HTTPException(status_code=404, detail=f"User {user_id} not enrolled")

    del user_latents[user_id]
    logger.info(f"Deleted enrollment for user: {user_id}")

    return {"success": True, "message": f"Enrollment deleted for user {user_id}"}


# ===========================================
# Main Entry Point
# ===========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
