"""Transient speech-to-text adapters for claim intake audio."""
from __future__ import annotations

import base64

import httpx

from app.config import settings
from app.services.document_pipeline import DocumentPipelineError

MAX_AUDIO_BYTES = 10 * 1024 * 1024
SUPPORTED_AUDIO_TYPES = {
    "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp3",
    "audio/mp4", "audio/aac", "audio/flac", "audio/x-m4a",
}


def transcribe_audio(content: bytes, content_type: str, provider: str = "auto") -> dict:
    """Transcribe in memory; audio and returned text are never persisted here."""
    if not content:
        raise ValueError("Record some audio before transcribing.")
    if len(content) > MAX_AUDIO_BYTES:
        raise ValueError("Audio must be 10 MB or smaller.")
    if content_type not in SUPPORTED_AUDIO_TYPES:
        raise ValueError("Use a supported audio format such as WebM, WAV, MP3, or M4A.")

    if provider not in {"auto", "sarvam", "gemini"}:
        raise ValueError("Choose Sarvam, Gemini, or automatic provider selection.")
    providers = (
        [p.strip().lower() for p in settings.ocr_provider_order.split(",") if p.strip()]
        if provider == "auto" else [provider]
    )
    failures = []
    for candidate in providers:
        if candidate not in {"sarvam", "gemini"}:
            continue
        try:
            text = _sarvam(content, content_type) if candidate == "sarvam" else _gemini(content, content_type)
            if text:
                return {"transcript": text, "provider": candidate}
            failures.append(f"{candidate}: no speech was recognized")
        except DocumentPipelineError as error:
            failures.append(f"{candidate}: {error}")
    if not providers or all(p not in {"sarvam", "gemini"} for p in providers):
        raise DocumentPipelineError("Configure SARVAM_API_KEY or GEMINI_API_KEY to transcribe audio.")
    raise DocumentPipelineError("Speech transcription failed. " + "; ".join(failures))


def _sarvam(content: bytes, content_type: str) -> str:
    if not settings.sarvam_api_key:
        raise DocumentPipelineError("SARVAM_API_KEY is not configured.")
    try:
        response = httpx.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": settings.sarvam_api_key},
            data={"model": "saaras:v4", "mode": "transcribe"},
            files={"file": ("intake-audio", content, content_type)},
            timeout=40,
        )
        response.raise_for_status()
        return str(response.json().get("transcript", "")).strip()
    except (httpx.HTTPError, ValueError) as error:
        raise DocumentPipelineError("Sarvam speech-to-text could not process this recording.") from error


def _gemini(content: bytes, content_type: str) -> str:
    if not settings.gemini_api_key:
        raise DocumentPipelineError("GEMINI_API_KEY is not configured.")
    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        try:
            result = client.interactions.create(
                model=settings.gemini_stt_model,
                input=[{
                    "type": "audio",
                    "data": base64.b64encode(content).decode("ascii"),
                    "mime_type": content_type,
                }],
                store=False,
            )
            return (result.output_text or "").strip()
        finally:
            client.close()
    except Exception as error:
        raise DocumentPipelineError("Gemini speech-to-text could not process this recording.") from error
