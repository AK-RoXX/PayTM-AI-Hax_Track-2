"""Transient speech-to-text adapters for claim intake audio."""
from __future__ import annotations

from io import BytesIO
import logging

import httpx

from app.config import settings
from app.services.document_pipeline import DocumentPipelineError

MAX_AUDIO_BYTES = 10 * 1024 * 1024
SUPPORTED_AUDIO_TYPES = {
    "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp3",
    "audio/mp4", "audio/aac", "audio/flac", "audio/x-m4a",
}
SUPPORTED_LANGUAGES = {
    "en-IN", "hi-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN", "gu-IN",
    "kn-IN", "ml-IN", "pa-IN", "od-IN", "as-IN", "ur-IN",
}
logger = logging.getLogger(__name__)


def transcribe_audio(content: bytes, content_type: str, language_code: str = "auto") -> dict:
    """Transcribe in memory; audio and returned text are never persisted here."""
    if not content:
        raise ValueError("Record some audio before transcribing.")
    if len(content) > MAX_AUDIO_BYTES:
        raise ValueError("Audio must be 10 MB or smaller.")
    content_type = content_type.split(";", 1)[0].strip().lower()
    if content_type not in SUPPORTED_AUDIO_TYPES:
        raise ValueError("Use a supported audio format such as WebM, WAV, MP3, or M4A.")

    if language_code != "auto" and language_code not in SUPPORTED_LANGUAGES:
        raise ValueError("Choose a supported Indian language or automatic language detection.")
    providers = [p.strip().lower() for p in settings.ocr_provider_order.split(",") if p.strip()]
    failures = []
    for candidate in providers:
        if candidate not in {"sarvam", "gemini"}:
            continue
        try:
            text = _sarvam(content, content_type, language_code) if candidate == "sarvam" else _gemini(content, content_type, language_code)
            if text:
                return {"transcript": text, "provider": candidate}
            failures.append(f"{candidate}: no speech was recognized")
        except DocumentPipelineError as error:
            failures.append(f"{candidate}: {error}")
    if not providers or all(p not in {"sarvam", "gemini"} for p in providers):
        raise DocumentPipelineError("Configure SARVAM_API_KEY or GEMINI_API_KEY to transcribe audio.")
    raise DocumentPipelineError("Speech transcription failed. " + "; ".join(failures))


def _sarvam(content: bytes, content_type: str, language_code: str) -> str:
    if not settings.sarvam_api_key:
        raise DocumentPipelineError("SARVAM_API_KEY is not configured.")
    try:
        response = httpx.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": settings.sarvam_api_key},
            data={
                "model": "saaras:v4",
                "language_code": language_code if language_code != "auto" else "unknown",
            },
            files={"file": ("intake-audio", content, content_type)},
            timeout=40,
        )
        response.raise_for_status()
        return str(response.json().get("transcript", "")).strip()
    except httpx.HTTPStatusError as error:
        logger.warning("Sarvam speech API returned HTTP %s", error.response.status_code)
        raise DocumentPipelineError("Sarvam speech-to-text could not process this recording.") from error
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Sarvam speech API request failed: %s", error)
        raise DocumentPipelineError("Sarvam speech-to-text could not process this recording.") from error


def _gemini(content: bytes, content_type: str, language_code: str) -> str:
    if not settings.gemini_api_key:
        raise DocumentPipelineError("GEMINI_API_KEY is not configured.")
    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        uploaded = None
        try:
            audio_file = BytesIO(content)
            audio_file.name = f"claim-intake.{content_type.rsplit('/', 1)[-1]}"
            uploaded = client.files.upload(
                file=audio_file,
                config={"mime_type": content_type},
            )
            result = client.interactions.create(
                model=settings.gemini_stt_model,
                input=[{
                    "type": "audio",
                    "uri": uploaded.uri,
                    "mime_type": uploaded.mime_type or content_type,
                }],
                **({
                    "generation_config": {
                        "transcription_config": {"language_codes": [language_code]},
                    },
                } if language_code != "auto" else {}),
                store=False,
            )
            return (result.output_text or "").strip()
        except Exception as error:
            logger.warning("Gemini speech transcription request failed: %s", error)
            raise
        finally:
            if uploaded is not None and uploaded.name:
                try:
                    client.files.delete(name=uploaded.name)
                except Exception as error:
                    logger.warning("Could not delete temporary Gemini audio file %s: %s", uploaded.name, error)
            client.close()
    except Exception as error:
        raise DocumentPipelineError("Gemini speech-to-text could not process this recording.") from error
