from pydantic import BaseModel

class EvidenceAnswer(BaseModel):
    answer: str
    answer_status: str
    evidence: list[dict]
    next_action: str | None = None
