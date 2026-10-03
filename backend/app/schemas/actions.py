from pydantic import BaseModel
from typing import Literal

class ReminderRequest(BaseModel):
    action: Literal["missing_document_reminder", "claim_follow_up"] = "missing_document_reminder"
    delay_minutes: int = 1

class ChatRequest(BaseModel):
    message: str
    language: str = "hinglish"
