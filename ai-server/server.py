"""
AI Server for Real-time Voice Cloning using Coqui XTTS v2
- POST /enroll/{user_id}: Voice enrollment (extract speaker latents)
- WebSocket /ws/tts/{user_id}: Real-time TTS streaming (Float32 PCM)
"""

import io
import os
import tempfile
from typing import Dict, Optional
from contextlib import asynccontextmanager

import torch
import numpy as np
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from loguru import logger

# TTS import
from TTS.api import TTS

# Configuration
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE = 24000  # XTTS v2 default sample rate

# Global storage
tts_model: Optional[TTS] = None
user_latents: Dict[str, dict] = {}  # {user_id: {"gpt_cond_latent": tensor, "speaker_embedding": tensor}}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS model on startup, cleanup on shutdown"""
    global tts_model

    logger.info(f"Loading XTTS v2 model on {DEVICE}...")
    try:
        tts_model = TTS(MODEL_NAME).to(DEVICE)
        logger.info("XTTS v2 model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load TTS model: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down AI server...")
    if tts_model is not None:
        del tts_model
        torch.cuda.empty_cache()


app = FastAPI(
    title="EUM AI Server",
    description="Real-time Voice Cloning TTS using XTTS v2",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EnrollResponse(BaseModel):
    success: bool
    message: str
    user_id: str


class TTSRequest(BaseModel):
    text: str
    language: str = "ko"  # Default to Korean


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": tts_model is not None,
        "device": DEVICE,
        "enrolled_users": list(user_latents.keys())
    }


@app.post("/enroll/{user_id}", response_model=EnrollResponse)
async def enroll_voice(user_id: str, audio: UploadFile = File(...)):
    """
    Enroll a user's voice by extracting speaker latents from audio file.

    - user_id: Unique identifier for the user
    - audio: WAV/MP3 audio file (minimum 6 seconds recommended)
    """
    if tts_model is None:
        raise HTTPException(status_code=503, detail="TTS model not loaded")

    logger.info(f"Enrolling voice for user: {user_id}")

    # Save uploaded audio to temp file
    temp_audio_path = None
    try:
        # Create temp file with proper extension
        suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_audio_path = temp_file.name

        # Extract speaker latents using XTTS synthesizer
        logger.info(f"Extracting speaker latents from: {temp_audio_path}")

        # Get the synthesizer from TTS model
        synthesizer = tts_model.synthesizer

        # Compute speaker latents
        gpt_cond_latent, speaker_embedding = synthesizer.tts_model.get_conditioning_latents(
            audio_path=temp_audio_path
        )

        # Store latents in memory
        user_latents[user_id] = {
            "gpt_cond_latent": gpt_cond_latent,
            "speaker_embedding": speaker_embedding
        }

        logger.info(f"Successfully enrolled user: {user_id}")

        return EnrollResponse(
            success=True,
            message=f"Voice enrolled successfully for user {user_id}",
            user_id=user_id
        )

    except Exception as e:
        logger.error(f"Failed to enroll voice for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Voice enrollment failed: {str(e)}")

    finally:
        # Cleanup temp file
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.unlink(temp_audio_path)


@app.websocket("/ws/tts/{user_id}")
async def websocket_tts(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time TTS streaming.

    Client sends: JSON {"text": "...", "language": "ko"}
    Server sends: Raw Float32 PCM audio bytes (24kHz, mono)
                  - AudioContext에서 직접 사용 가능한 포맷
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for TTS: user={user_id}")

    # Check if user is enrolled
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
            # Receive text request
            data = await websocket.receive_json()
            text = data.get("text", "")
            language = data.get("language", "ko")

            if not text:
                await websocket.send_json({"error": "Empty text"})
                continue

            logger.info(f"TTS request: user={user_id}, lang={language}, text={text[:50]}...")

            try:
                # Get user's speaker latents
                latents = user_latents[user_id]
                gpt_cond_latent = latents["gpt_cond_latent"]
                speaker_embedding = latents["speaker_embedding"]

                # Generate speech using streaming inference
                synthesizer = tts_model.synthesizer

                # Use streaming inference for real-time output
                chunks = synthesizer.tts_model.inference_stream(
                    text=text,
                    language=language,
                    gpt_cond_latent=gpt_cond_latent,
                    speaker_embedding=speaker_embedding,
                    stream_chunk_size=20,  # Number of tokens per chunk
                    enable_text_splitting=True
                )

                # Send audio chunks as they're generated
                for chunk in chunks:
                    if chunk is not None:
                        # Convert tensor to Float32 numpy array
                        # XTTS output is already normalized to [-1, 1] range
                        audio_float32 = chunk.cpu().numpy().astype(np.float32)

                        # Send raw Float32 PCM bytes directly
                        # Frontend AudioContext can use this directly without conversion
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload for production with GPU
        log_level="info"
    )
