from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.services.document_pipeline import (
    AuthenticationError,
    DocumentPipelineError,
    authenticate_user,
)
from app.services.speech_service import MAX_AUDIO_BYTES, transcribe_audio

router = APIRouter(prefix="/speech", tags=["speech"])


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    provider: str = Form(default="auto"),
    authorization: str | None = Header(default=None),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "A valid Supabase bearer token is required.")
    try:
        await run_in_threadpool(authenticate_user, authorization[7:].strip())
    except AuthenticationError as error:
        raise HTTPException(401, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error

    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio must be 10 MB or smaller.")
    try:
        return await run_in_threadpool(
            transcribe_audio,
            content,
            audio.content_type or "",
            provider.strip().lower(),
        )
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error
