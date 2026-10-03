from pydantic import BaseModel
from typing import Literal, Optional

class EvidenceRef(BaseModel):
    document_name: str
    page_number: int
    section: Optional[str] = None
    quote: str
    confidence: float

class DocumentResponse(BaseModel):
    id: str
    case_id: str
    document_type: str
    filename: str
    status: Literal["uploaded", "processing", "extracted", "needs_review"]
    extracted_facts: dict = {}
    evidence: list[EvidenceRef] = []
