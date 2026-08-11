import tempfile
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from groq import Groq
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/speech", tags=["Speech"])
logger = logging.getLogger(__name__)

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/transcribe", summary="Transcribe Audio — Speech-to-Text via Groq Whisper")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key is not configured on server.")

    contents = await file.read()
    if not contents or len(contents) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    if len(contents) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB limit.")

    filename = file.filename or "recording.webm"
    ext = os.path.splitext(filename)[1] or ".webm"

    # Save audio stream to temporary file for Groq client
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        client = Groq(api_key=settings.GROQ_API_KEY)
        with open(temp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(temp_path), audio_file.read()),
                model="whisper-large-v3-turbo",
                response_format="json",
                language="en",
                temperature=0.0
            )

        transcript_text = getattr(transcription, "text", "") or ""
        return {"transcript": transcript_text.strip()}

    except Exception as e:
        logger.error(f"Speech transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Speech transcription failed.")

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
