# Adapter boundary for Sarvam. Keep demo fallback so the app runs without credentials.
async def transcribe_audio(_: bytes) -> str:
    return "Mummy ko hospital mein admit kiya hai. Bill teen lakh ka hai. Policy hai but claim samajh nahi aa raha."

async def digitize_document(_: bytes, filename: str) -> dict:
    return {"provider":"demo_fallback", "filename":filename, "text":"Document digitization will use Sarvam Document Intelligence when SARVAM_API_KEY is configured.", "confidence":0.0}
