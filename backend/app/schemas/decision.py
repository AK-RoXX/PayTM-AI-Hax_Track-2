from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class PolicyTermCitation(BaseModel):
    term_key: str
    label: str
    value_rendered: str
    numeric_value: float | None = None
    document_name: str
    page_number: int | None = None
    clause_quote: str = ""
    confidence: float = 1.0


class FinancialSummaryBreakdown(BaseModel):
    gross_bill: float = 0.0
    admissible_charges: float = 0.0
    room_icu_charges: float = 0.0
    pharmacy_diagnostics: float = 0.0
    non_medical_deductions: float = 0.0
    proportionate_deductions: float = 0.0
    total_deductions: float = 0.0
    copay_percentage: float = 0.0
    copay_amount: float = 0.0
    estimated_net_payout: float = 0.0
    estimated_out_of_pocket: float = 0.0
    calculation_basis: str = ""


class ClaimVerificationItem(BaseModel):
    key: str
    label: str
    status: Literal["verified", "missing", "needs_review", "conflict"]
    reason: str
    document_name: str | None = None


class ClaimVerificationStatus(BaseModel):
    readiness_score: int
    completion_state: Literal["complete", "incomplete", "blocked"]
    verified_count: int
    total_requirements: int
    items: list[ClaimVerificationItem] = []
    has_conflicts: bool = False


class DecisionProofCitation(BaseModel):
    title: str
    document_name: str
    page_number: int | None = None
    quote: str
    confidence: float = 1.0
    category: str = "policy"  # policy | bill | medical | identity


class DecisionOutcome(BaseModel):
    branch: Literal["proceed", "abstain", "escalate"]
    status_label: str
    badge_variant: Literal["green", "amber", "red", "blue"]
    headline: str
    detailed_rationale: str
    proofs: list[DecisionProofCitation] = []
    abstain_or_rejection_reasons: list[str] = []
    estimated_approval_amount: float | None = None


class HumanEscalationDossier(BaseModel):
    is_recommended: bool = False
    reason: str = ""
    dossier_summary: str = ""
    discrepancies: list[str] = []
    source_facts: list[dict[str, Any]] = []
    cognee_context_snippets: list[str] = []


class UserNextStep(BaseModel):
    step_id: str
    priority: Literal["critical", "high", "medium", "optional"]
    title: str
    description: str
    action_type: Literal[
        "upload_document",
        "review_bill_lines",
        "confirm_policy_terms",
        "submit_claim",
        "request_human_escalation",
        "download_dossier",
    ]
    target_route: str
    action_label: str


class DecisionFlowResponse(BaseModel):
    case_id: str
    case_code: str
    policy_claims: list[PolicyTermCitation] = []
    financial_summary: FinancialSummaryBreakdown
    claim_verification: ClaimVerificationStatus
    decision: DecisionOutcome
    escalation: HumanEscalationDossier
    next_steps: list[UserNextStep] = []


class EscalationRequest(BaseModel):
    reason: str = "User requested human escalation and supervisor review"
    note: str | None = None
