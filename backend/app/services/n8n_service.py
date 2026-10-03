import httpx
from app.config import settings

async def trigger_workflow(payload: dict) -> dict:
    if not settings.n8n_webhook_url:
        return {"mode":"demo", "accepted":True, "message":"n8n webhook not configured; simulated workflow event."}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(settings.n8n_webhook_url, json=payload, headers={"X-Sahaayak-Secret":settings.n8n_callback_secret})
        response.raise_for_status()
        return response.json() if response.content else {"accepted":True}
