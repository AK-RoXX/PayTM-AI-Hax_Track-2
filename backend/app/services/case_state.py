"""
case_state.py — derive everything the claim workflow shows from persisted data.

Nothing in here reads a hardcoded case. Readiness, missing requirements, the
financial map, the timeline and the next action are all recomputed from the
documents a user actually uploaded and the facts that were extracted from them,
so the review page always reflects the current state of the case.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Iterable

from app.services.claim_facts import fact_label
from app.services.document_pipeline import (
    CaseAccessError,
    DocumentPipelineError,
    _supabase_request,
)

logger = logging.getLogger(__name__)

CASE_COLUMNS = (
    "id,case_code,case_type,status,patient_relation,hospital_name,language_pref,"
    "readiness_score,next_action,estimated_bill,estimated_coverage,estimated_gap,created_at,updated_at"
)
FACT_COLUMNS = (
    "id,case_id,document_id,fact_key,value_json,value_type,verification_status,"
    "source_page,source_quote,confidence,documents(file_name,document_type)"
)
DOCUMENT_COLUMNS = (
    "id,case_id,document_type,file_name,processing_status,error_message,"
    "page_count,processing_provider,uploaded_at"
)
EVENT_COLUMNS = "id,case_id,event_type,actor,payload_json,occurred_at"

PLANNING_DISCLAIMER = (
    "This is only a sum-insured ceiling, not an expected payout. Room and ICU limits, "
    "exclusions, co-payments, deductibles, waiting periods, and prior claims are not applied; "
    "the actual gap may be higher. Final coverage is decided by your insurer."
)
CONFLICT_CONFIDENCE_FLOOR = 0.85
TERMINAL_STATUSES = {"submitted", "closed"}


@dataclass(frozen=True)
class Requirement:
    key: str
    label: str
    document_type: str
    weight: int
    partial_credit: int
    reason: str
    anchor_fact: str | None = None
    anchor_label: str = ""
    anchor_must_be_true: bool = False


REQUIREMENTS: tuple[Requirement, ...] = (
    Requirement(
        key="health_policy",
        label="Health insurance policy",
        document_type="health_policy",
        weight=25,
        partial_credit=8,
        reason="Upload your policy schedule so we can read your sum insured and room rent limit.",
        anchor_fact="policy_number",
        anchor_label="Policy number is not readable in the policy you uploaded",
    ),
    Requirement(
        key="hospital_estimate",
        label="Hospital estimate or final bill",
        document_type="hospital_estimate",
        weight=20,
        partial_credit=8,
        reason="Upload the hospital estimate or final bill so we can map your costs.",
        anchor_fact="estimated_total_amount",
        anchor_label="Total amount is not readable in the bill you uploaded",
    ),
    Requirement(
        key="discharge_summary",
        label="Discharge summary",
        document_type="discharge_summary",
        weight=25,
        partial_credit=10,
        reason="Upload the discharge summary so the insurer can verify the treatment.",
        anchor_fact="doctor_signature_present",
        anchor_label="We need the discharge summary signed by the treating doctor",
        anchor_must_be_true=True,
    ),
    Requirement(
        key="admission_record",
        label="Admission record",
        document_type="admission_record",
        weight=15,
        partial_credit=6,
        reason="Upload the admission record so the hospital stay can be verified.",
        anchor_fact="admission_date",
        anchor_label="Admission date is not readable in the record you uploaded",
    ),
    Requirement(
        key="identity_proof",
        label="Identity proof",
        document_type="identity_proof",
        weight=15,
        partial_credit=6,
        reason="Upload an identity proof so your claim can be verified.",
        anchor_fact="identity_document_type",
        anchor_label="Document type is not readable in the identity proof you uploaded",
    ),
)

REQUIREMENTS_BY_KEY = {requirement.key: requirement for requirement in REQUIREMENTS}


# ── Reads ────────────────────────────────────────────────────────────────────


def fetch_case_row(case_id: str, user_id: str) -> dict:
    response = _supabase_request(
        "GET",
        "/rest/v1/cases",
        params={
            "id": f"eq.{case_id}",
            "user_id": f"eq.{user_id}",
            "select": CASE_COLUMNS,
        },
    )
    cases = response.json()
    if not cases:
        raise CaseAccessError("Case not found.")
    return cases[0]


def fetch_case_documents(case_id: str) -> list[dict]:
    response = _supabase_request(
        "GET",
        "/rest/v1/documents",
        params={
            "case_id": f"eq.{case_id}",
            "select": DOCUMENT_COLUMNS,
            "order": "uploaded_at.desc",
        },
    )
    return response.json()


def fetch_case_facts(case_id: str) -> list[dict]:
    response = _supabase_request(
        "GET",
        "/rest/v1/case_facts",
        params={
            "case_id": f"eq.{case_id}",
            "select": FACT_COLUMNS,
            "order": "confidence.desc",
        },
    )
    return response.json()


def fetch_case_events(case_id: str) -> list[dict]:
    response = _supabase_request(
        "GET",
        "/rest/v1/case_events",
        params={
            "case_id": f"eq.{case_id}",
            "select": EVENT_COLUMNS,
            "order": "occurred_at.desc",
            "limit": "25",
        },
    )
    return response.json()


def load_case_state(case_id: str, user_id: str) -> dict:
    """Load a case plus everything derived from it, scoped to its owner."""
    case = fetch_case_row(case_id, user_id)
    documents = fetch_case_documents(case_id)
    facts = fetch_case_facts(case_id)
    events = fetch_case_events(case_id)
    view = build_case_view(case, documents, facts, events)
    return {"case": case, "documents": documents, "facts": facts, "events": events, "view": view}


# ── Fact resolution ─────────────────────────────────────────────────────────


def _document_meta(fact: dict) -> dict:
    document = fact.get("documents")
    if isinstance(document, list):
        document = document[0] if document else None
    return document or {}


def resolve_facts(facts: Iterable[dict]) -> dict[str, dict]:
    """Pick one value per fact key and flag keys that disagree across documents."""
    grouped: dict[str, list[dict]] = {}
    for fact in facts:
        grouped.setdefault(fact.get("fact_key", ""), []).append(fact)

    resolved: dict[str, dict] = {}
    for fact_key, candidates in grouped.items():
        values = {repr(candidate.get("value_json")) for candidate in candidates}
        best = max(
            candidates,
            key=lambda candidate: (
                float(candidate.get("confidence") or 0),
                candidate.get("uploaded_at") or "",
            ),
        )
        entry = {
            "fact_key": fact_key,
            "value": best.get("value_json"),
            "value_type": best.get("value_type") or "text",
            "confidence": float(best.get("confidence") or 0),
            "conflicting": len(values) > 1,
            "source_page": best.get("source_page"),
            "source_quote": best.get("source_quote") or "",
            "document_id": best.get("document_id"),
            "document_name": _document_meta(best).get("file_name") or "",
            "sources": [
                {
                    "document_id": candidate.get("document_id"),
                    "document_name": _document_meta(candidate).get("file_name") or "",
                    "page_number": candidate.get("source_page"),
                    "quote": candidate.get("source_quote") or "",
                    "confidence": float(candidate.get("confidence") or 0),
                }
                for candidate in candidates
            ],
        }
        if entry["conflicting"] or entry["confidence"] < CONFLICT_CONFIDENCE_FLOOR:
            entry["verification_status"] = (
                "conflict" if entry["conflicting"] else "needs_review"
            )
        else:
            entry["verification_status"] = "extracted"
        resolved[fact_key] = entry
    return resolved


def _fact_document_ids(resolved: dict[str, dict]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for entry in resolved.values():
        for source in entry["sources"]:
            if source["document_id"]:
                mapping.setdefault(source["document_id"], source["document_name"])
    return mapping


# ── Derived view ────────────────────────────────────────────────────────────


def build_case_view(
    case: dict,
    documents: list[dict],
    facts: list[dict],
    events: list[dict] | None = None,
) -> dict:
    resolved = resolve_facts(facts)
    processed_types = {
        document["document_type"]
        for document in documents
        if document.get("processing_status") == "done"
    }
    failed_documents = [
        document for document in documents if document.get("processing_status") == "failed"
    ]

    verified_items: list[str] = []
    missing_requirements: list[dict] = []
    score = 0

    for requirement in REQUIREMENTS:
        satisfied, reason = _requirement_state(requirement, processed_types, resolved)
        if satisfied:
            score += requirement.weight
            verified_items.append(requirement.label)
            continue

        if requirement.document_type in processed_types:
            score += requirement.partial_credit
            if reason is None:
                reason = requirement.anchor_label or requirement.reason
        else:
            reason = requirement.reason

        missing_requirements.append(
            {
                "name": requirement.label,
                "reason": reason,
                "priority": _priority(requirement.weight),
            }
        )

    next_best_action = (
        missing_requirements[0]["name"]
        if missing_requirements
        else "All required documents are in. Submit the claim to your insurer."
    )
    next_best_action = (
        f"Upload the {next_best_action[0].lower()}{next_best_action[1:]}."
        if missing_requirements
        else next_best_action
    )

    blocked = bool(missing_requirements) or not documents
    status = _derive_status(case.get("status"), documents, blocked)

    return {
        "id": str(case.get("id")),
        "case_code": case.get("case_code"),
        "case_type": case.get("case_type") or "medical_claim",
        "status": status,
        "urgency": "high" if failed_documents else "normal",
        "patient_relation": case.get("patient_relation") or "self",
        "hospital_name": _resolve_hospital_name(case, resolved),
        "readiness_score": max(0, min(score, 100)),
        "next_best_action": next_best_action,
        "financial_map": _build_financial_map(case, resolved),
        "missing_requirements": missing_requirements,
        "verified_items": verified_items,
        "timeline": _build_timeline(documents, events or []),
        "documents": _build_documents(documents, resolved),
        "facts": _build_facts(facts, resolved),
        "updated_at": case.get("updated_at"),
    }


def _requirement_state(
    requirement: Requirement,
    processed_types: set[str],
    resolved: dict[str, dict],
) -> tuple[bool, str | None]:
    if requirement.document_type not in processed_types:
        return False, None

    if not requirement.anchor_fact:
        return True, None

    anchor = resolved.get(requirement.anchor_fact)
    if anchor is None:
        return False, requirement.anchor_label

    value = anchor["value"]
    if requirement.anchor_must_be_true:
        if value is True:
            return True, None
        return False, requirement.anchor_label
    return bool(value) or value not in (None, "", 0), None


def _priority(weight: int) -> str:
    if weight >= 25:
        return "high"
    if weight >= 15:
        return "medium"
    return "low"


def _resolve_hospital_name(case: dict, resolved: dict[str, dict]) -> str:
    from_fact = resolved.get("hospital_name")
    if from_fact and from_fact["value"]:
        return str(from_fact["value"]).strip()
    return case.get("hospital_name") or ""


def _build_financial_map(case: dict, resolved: dict[str, dict]) -> dict:
    estimate_fact = resolved.get("estimated_total_amount")
    estimate = (
        _first_money(resolved, "estimated_total_amount")
        if estimate_fact and estimate_fact.get("verification_status") != "conflict"
        else None
    )
    estimate = estimate if estimate is not None else _number(case.get("estimated_bill"))

    sum_insured_fact = resolved.get("sum_insured")
    sum_insured = (
        _first_money(resolved, "sum_insured")
        if sum_insured_fact
        and sum_insured_fact.get("verification_status") not in {"conflict", "needs_review"}
        else None
    )

    inputs_available = estimate is not None and sum_insured is not None
    ceiling = min(sum_insured, estimate) if inputs_available else 0.0
    estimate_value = estimate or 0.0
    status = (
        "bill_amount_missing"
        if estimate is None
        else "sum_insured_missing"
        if sum_insured is None
        else "sum_insured_ceiling_only"
    )
    return {
        "hospital_estimate": round(estimate_value, 2),
        "possible_coverage": round(ceiling, 2),
        "estimated_gap": round(max(estimate_value - ceiling, 0.0), 2) if inputs_available else 0.0,
        "status": "planning_estimate",
        "calculation_status": status,
        "possible_coverage_basis": "sum_insured_ceiling_only",
        "estimated_gap_basis": "minimum_gap_before_policy_adjustments",
        "disclaimer": PLANNING_DISCLAIMER,
    }


def _first_money(resolved: dict[str, dict], fact_key: str) -> float | None:
    entry = resolved.get(fact_key)
    if not entry or entry["value"] is None:
        return None
    try:
        return float(entry["value"])
    except (TypeError, ValueError):
        return None


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _derive_status(current: str | None, documents: list[dict], blocked: bool) -> str:
    if current in TERMINAL_STATUSES:
        return current
    if not documents:
        return "intake"
    if blocked:
        return "docs_pending"
    return "awaiting_hospital_verification"


def _build_documents(documents: list[dict], resolved: dict[str, dict]) -> list[dict]:
    names = _fact_document_ids(resolved)
    built = []
    for document in documents:
        facts = [
            entry
            for entry in resolved.values()
            if any(source["document_id"] == document["id"] for source in entry["sources"])
        ]
        extraction_status = _extraction_status(document, facts)
        built.append(
            {
                "id": document["id"],
                "case_id": document.get("case_id"),
                "document_type": document.get("document_type"),
                "file_name": document.get("file_name"),
                "processing_status": document.get("processing_status"),
                "processing_provider": document.get("processing_provider"),
                "page_count": document.get("page_count"),
                "error_message": document.get("error_message"),
                "uploaded_at": document.get("uploaded_at"),
                "extraction_status": extraction_status,
                "facts_count": len(facts),
                "facts": [
                    {
                        "fact_key": entry["fact_key"],
                        "label": fact_label(entry["fact_key"]),
                        "value_json": entry["value"],
                        "value_type": entry.get("value_type") or "text",
                        "confidence": entry["confidence"],
                        "verification_status": entry["verification_status"],
                        "source_page": entry.get("source_page"),
                        "source_quote": entry.get("source_quote") or "",
                    }
                    for entry in facts
                ],
            }
        )
    return built


def _extraction_status(document: dict, facts: list[dict]) -> str:
    processing_status = document.get("processing_status")
    if processing_status == "failed":
        return "failed"
    if processing_status != "done":
        return "pending"
    return "done" if facts else "no_facts_found"


def _build_facts(facts: list[dict], resolved: dict[str, dict]) -> list[dict]:
    built = []
    for fact in facts:
        fact_key = fact.get("fact_key")
        resolved_entry = resolved.get(fact_key, {})
        built.append(
            {
                "id": fact.get("id"),
                "fact_key": fact_key,
                "label": fact_label(fact_key),
                "value_json": fact.get("value_json"),
                "value_type": fact.get("value_type"),
                "verification_status": resolved_entry.get(
                    "verification_status", fact.get("verification_status")
                ),
                "conflicting": resolved_entry.get("conflicting", False),
                "confidence": float(fact.get("confidence") or 0),
                "document_id": fact.get("document_id"),
                "document_name": _document_meta(fact).get("file_name") or "",
                "source_page": fact.get("source_page"),
                "source_quote": fact.get("source_quote") or "",
            }
        )
    return built


def _build_timeline(documents: list[dict], events: list[dict]) -> list[dict]:
    entries: list[dict] = []
    for event in events:
        payload = event.get("payload_json") or {}
        if not isinstance(payload, dict):
            payload = {}
        entries.append(
            {
                "id": event.get("id"),
                "title": payload.get("title") or _title_for_event(event.get("event_type")),
                "detail": payload.get("detail") or "",
                "occurred_at": event.get("occurred_at"),
                "status": "complete",
            }
        )
    for document in documents:
        entries.append(
            {
                "id": f"document-{document['id']}",
                "title": f"Uploaded {document.get('file_name') or 'document'}",
                "detail": _document_detail(document),
                "occurred_at": document.get("uploaded_at"),
                "status": _document_timeline_status(document),
            }
        )

    entries.sort(key=lambda entry: entry.get("occurred_at") or "", reverse=True)
    if entries:
        entries[0]["status"] = "current"
    return entries


def _title_for_event(event_type: str | None) -> str:
    return (event_type or "Case update").replace("_", " ").capitalize()


def _document_detail(document: dict) -> str:
    if document.get("processing_status") == "failed":
        return document.get("error_message") or "Processing failed."
    pages = document.get("page_count")
    if pages:
        return f"{pages} page{'s' if pages != 1 else ''} processed"
    return "Uploaded"


def _document_timeline_status(document: dict) -> str:
    if document.get("processing_status") == "failed":
        return "attention"
    if document.get("processing_status") == "done":
        return "complete"
    return "pending"


# ── Writes ──────────────────────────────────────────────────────────────────


def sync_case_progress(case_id: str, view: dict) -> None:
    """Persist the recomputed readiness, money map and status back to the case."""
    financial_map = view["financial_map"]
    patch = {
        "readiness_score": view["readiness_score"],
        "next_action": view["next_best_action"],
        "status": view["status"],
        "estimated_bill": financial_map["hospital_estimate"],
        "estimated_coverage": financial_map["possible_coverage"],
        "estimated_gap": financial_map["estimated_gap"],
    }
    try:
        _supabase_request(
            "PATCH",
            f"/rest/v1/cases?id=eq.{case_id}",
            headers={"Prefer": "return=minimal"},
            json=patch,
        )
    except DocumentPipelineError as error:
        logger.warning("Could not persist case progress for %s: %s", case_id, error)


def record_case_event(
    case_id: str,
    event_type: str,
    title: str,
    detail: str,
    actor: str = "system",
) -> None:
    try:
        _supabase_request(
            "POST",
            "/rest/v1/case_events",
            headers={"Prefer": "return=minimal"},
            json=[
                {
                    "case_id": case_id,
                    "event_type": event_type,
                    "actor": actor,
                    "payload_json": {"title": title, "detail": detail},
                }
            ],
        )
    except DocumentPipelineError as error:
        logger.warning("Could not record case event for %s: %s", case_id, error)
