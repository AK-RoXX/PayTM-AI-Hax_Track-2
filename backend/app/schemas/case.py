from pydantic import BaseModel, Field
from typing import Any, Literal

class FinancialMap(BaseModel):
    hospital_estimate: float
    possible_coverage: float
    estimated_gap: float
    status: Literal["planning_estimate"] = "planning_estimate"
    disclaimer: str

class MissingRequirement(BaseModel):
    name: str
    reason: str
    priority: Literal["low", "medium", "high"]

class TimelineEvent(BaseModel):
    id: str
    title: str
    detail: str
    occurred_at: str | None = None
    status: Literal["complete", "current", "pending", "attention"]

class ExtractedFact(BaseModel):
    fact_key: str
    label: str
    value_json: Any = None
    value_type: str
    verification_status: str
    confidence: float
    source_page: int | None = None
    source_quote: str = ""
    document_id: str | None = None
    document_name: str = ""
    conflicting: bool = False

class CaseDocument(BaseModel):
    id: str
    case_id: str | None = None
    document_type: str
    file_name: str
    processing_status: str
    processing_provider: str | None = None
    page_count: int | None = None
    error_message: str | None = None
    uploaded_at: str | None = None
    extraction_status: str
    facts_count: int
    facts: list[ExtractedFact]

class CaseResponse(BaseModel):
    id: str
    case_code: str | None = None
    case_type: str
    status: str
    urgency: str
    patient_relation: str
    hospital_name: str
    readiness_score: int = Field(ge=0, le=100)
    next_best_action: str
    financial_map: FinancialMap
    missing_requirements: list[MissingRequirement]
    verified_items: list[str]
    timeline: list[TimelineEvent]
    documents: list[CaseDocument] = []
    facts: list[ExtractedFact] = []
    updated_at: str | None = None

class ReadinessResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    missing_requirements: list[MissingRequirement]
    verified_items: list[str]
    next_best_action: str
    documents_processing: int
    documents_failed: int

class EvidenceItem(BaseModel):
    claim: str
    document_name: str
    page_number: int | None = None
    quote: str
    confidence: float

class EvidenceResponse(BaseModel):
    items: list[EvidenceItem]

class CaseCreateRequest(BaseModel):
    message: str = Field(min_length=1)
    language: str = "hinglish"
    # Optional answers from the intake form. Anything the user typed wins over
    # what we could parse out of the message.
    patient_relation: str | None = None
    hospital_name: str | None = None
    estimated_bill: float | None = Field(default=None, ge=0)