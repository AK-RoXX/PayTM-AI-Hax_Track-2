"""
cases.py — the real claim path.

Every handler here reads the signed-in user's own Supabase data. Nothing is
served from a seeded demo case: readiness, missing requirements, evidence and
the money map are all derived from the documents the user uploaded and the
facts extracted from them.
"""
from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from starlette.concurrency import run_in_threadpool

from app.agents.intake_agent import run_intake
from app.schemas.case import (
    CaseCreateRequest,
    CaseResponse,
    CaseUpdateRequest,
    EvidenceResponse,
    ReadinessResponse,
)
from app.schemas.policy import BillLineItemsReviewRequest, PolicyAssessmentRequest
from app.services import case_state
from app.services.case_state import load_case_state
from app.services.document_pipeline import (
    AuthenticationError,
    CaseAccessError,
    DocumentPipelineError,
    _supabase_request,
    authenticate_user,
)
from app.services.policy_assessment import (
    PolicyAssessmentError,
    assess_policy_for_case,
    get_bill_line_items,
    get_policy_assessment,
    get_policy_terms_for_case,
    save_bill_line_items,
)

router = APIRouter(prefix="/cases", tags=["cases"])
logger = logging.getLogger(__name__)


def _access_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "A valid Supabase bearer token is required.")
    return authorization[7:].strip()


async def _user_id(authorization: str | None) -> str:
    try:
        return await run_in_threadpool(authenticate_user, _access_token(authorization))
    except AuthenticationError as error:
        raise HTTPException(401, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, CaseAccessError):
        return HTTPException(404, str(error))
    return HTTPException(503, str(error))


async def _load_state(case_id: str, authorization: str | None) -> dict:
    user_id = await _user_id(authorization)
    try:
        return await run_in_threadpool(load_case_state, case_id, user_id)
    except (CaseAccessError, DocumentPipelineError) as error:
        raise _http_error(error) from error


@router.post("", response_model=CaseResponse)
async def create_case(payload: CaseCreateRequest, authorization: str | None = Header(default=None)):
    """Create a claim owned by the signed-in user, seeded from their message."""
    user_id = await _user_id(authorization)
    intake = run_intake(payload.message)
    case_code = f"MED-{uuid4().hex[:8].upper()}"

    try:
        created = await run_in_threadpool(
            _insert_case,
            user_id,
            case_code,
            intake,
            payload.message,
            payload.language,
            {
                "patient_relation": payload.patient_relation,
                "hospital_name": payload.hospital_name,
                "estimated_bill": payload.estimated_bill,
            },
        )
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error

    state = await _load_state(created["id"], authorization)
    return state["view"]


def _insert_case(
    user_id: str,
    case_code: str,
    intake: dict,
    message: str,
    language: str,
    overrides: dict | None = None,
) -> dict:
    import re
    overrides = overrides or {}
    final_hospital = (overrides.get("hospital_name") or "").strip() or (intake.get("hospital_name") or "").strip() or None
    final_relation = overrides.get("patient_relation") or intake.get("patient_relation")
    final_bill = (
        overrides.get("estimated_bill")
        if overrides.get("estimated_bill") is not None
        else intake.get("estimated_bill_amount")
    )

    created = _supabase_request(
        "POST",
        "/rest/v1/cases",
        headers={"Prefer": "return=representation"},
        json={
            "case_code": case_code,
            "user_id": user_id,
            "case_type": "medical_claim",
            "status": "intake",
            "patient_relation": final_relation,
            "hospital_name": final_hospital,
            "language_pref": language if language in {"english", "hindi", "hinglish"} else "hinglish",
            "estimated_bill": final_bill,
        },
    ).json()
    case = created[0]

    _supabase_request(
        "POST",
        "/rest/v1/messages",
        headers={"Prefer": "return=minimal"},
        json=[{"case_id": case["id"], "role": "user", "content": message.strip(), "language": language}],
    )
    case_state.record_case_event(
        case["id"],
        "case_created",
        "Claim created",
        message.strip()[:200],
        actor="user",
    )

    user_facts = []
    if final_hospital:
        user_facts.append({
            "case_id": case["id"],
            "document_id": None,
            "fact_key": "hospital_name",
            "value_json": final_hospital,
            "value_type": "text",
            "verification_status": "verified",
            "source_page": None,
            "source_quote": f"Hospital '{final_hospital}' provided during claim intake",
            "confidence": 0.95,
        })
    if final_bill is not None and float(final_bill) > 0:
        user_facts.append({
            "case_id": case["id"],
            "document_id": None,
            "fact_key": "estimated_total_amount",
            "value_json": float(final_bill),
            "value_type": "money",
            "verification_status": "extracted",
            "source_page": None,
            "source_quote": f"Estimated bill of ₹{float(final_bill):,.0f} entered in claim intake",
            "confidence": 0.90,
        })
    if final_relation:
        user_facts.append({
            "case_id": case["id"],
            "document_id": None,
            "fact_key": "patient_relation",
            "value_json": final_relation,
            "value_type": "text",
            "verification_status": "verified",
            "source_page": None,
            "source_quote": f"Patient relation: {final_relation}",
            "confidence": 0.95,
        })

    policy_match = re.search(r"(?:policy\s*(?:no\.?|number|id|#)|insurance\s*(?:no\.?|id))\s*[:#-]?\s*([A-Za-z0-9\-/]{4,})", message, re.I)
    if policy_match:
        user_facts.append({
            "case_id": case["id"],
            "document_id": None,
            "fact_key": "policy_number",
            "value_json": policy_match.group(1).strip(),
            "value_type": "text",
            "verification_status": "extracted",
            "source_page": None,
            "source_quote": policy_match.group(0).strip(),
            "confidence": 0.88,
        })

    if user_facts:
        try:
            _supabase_request(
                "POST",
                "/rest/v1/case_facts",
                headers={"Prefer": "return=minimal"},
                json=user_facts,
            )
        except Exception as error:
            logger.warning("Could not persist initial intake facts for %s: %s", case["id"], error)

    return case


def _fetch_case_for_user(case_id: str, user_id: str) -> dict:
    """Case row scoped to the signed-in owner. Raises if the case is not theirs."""
    response = _supabase_request(
        "GET",
        "/rest/v1/cases",
        params={
            "id": f"eq.{case_id}",
            "user_id": f"eq.{user_id}",
            "select": case_state.CASE_COLUMNS,
        },
    )
    rows = response.json()
    if not rows:
        raise case_state.CaseAccessError("Case not found.")
    return rows[0]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, authorization: str | None = Header(default=None)):
    state = await _load_state(case_id, authorization)
    return state["view"]


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    payload: CaseUpdateRequest,
    authorization: str | None = Header(default=None),
):
    """Update claim details such as total bill, hospital name, or patient relation."""
    user_id = await _user_id(authorization)
    await run_in_threadpool(_fetch_case_for_user, case_id, user_id)

    updates = payload.model_dump(exclude_unset=True)
    if updates:
        await run_in_threadpool(_update_case_data, case_id, user_id, updates)

    state = await _load_state(case_id, authorization)
    return state["view"]


def _update_case_data(case_id: str, user_id: str, updates: dict) -> None:
    from datetime import datetime, timezone

    case_patch: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if "estimated_bill" in updates:
        case_patch["estimated_bill"] = updates["estimated_bill"]
    if "hospital_name" in updates:
        case_patch["hospital_name"] = (updates["hospital_name"] or "").strip() or None
    if "patient_relation" in updates:
        case_patch["patient_relation"] = updates["patient_relation"]
    if "status" in updates:
        case_patch["status"] = updates["status"]

    _supabase_request(
        "PATCH",
        "/rest/v1/cases",
        params={"id": f"eq.{case_id}", "user_id": f"eq.{user_id}"},
        headers={"Prefer": "return=minimal"},
        json=case_patch,
    )

    if "estimated_bill" in updates:
        bill_val = updates["estimated_bill"]
        try:
            _supabase_request(
                "DELETE",
                "/rest/v1/case_facts",
                params={"case_id": f"eq.{case_id}", "fact_key": "eq.estimated_total_amount", "document_id": "is.null"},
                headers={"Prefer": "return=minimal"},
            )
            if bill_val is not None and float(bill_val) > 0:
                _supabase_request(
                    "POST",
                    "/rest/v1/case_facts",
                    headers={"Prefer": "return=minimal"},
                    json=[{
                        "case_id": case_id,
                        "document_id": None,
                        "fact_key": "estimated_total_amount",
                        "value_json": float(bill_val),
                        "value_type": "money",
                        "verification_status": "verified",
                        "source_page": None,
                        "source_quote": f"Updated estimated bill of ₹{float(bill_val):,.0f} provided by user",
                        "confidence": 0.99,
                    }],
                )
        except Exception as error:
            logger.warning("Could not update case fact estimated_total_amount for %s: %s", case_id, error)

        case_state.record_case_event(
            case_id,
            "bill_updated",
            "Total bill updated",
            f"Total estimated bill updated to ₹{float(bill_val or 0):,.0f}",
            actor="user",
        )

    if "hospital_name" in updates and updates["hospital_name"]:
        h_name = updates["hospital_name"].strip()
        try:
            _supabase_request(
                "DELETE",
                "/rest/v1/case_facts",
                params={"case_id": f"eq.{case_id}", "fact_key": "eq.hospital_name", "document_id": "is.null"},
                headers={"Prefer": "return=minimal"},
            )
            _supabase_request(
                "POST",
                "/rest/v1/case_facts",
                headers={"Prefer": "return=minimal"},
                json=[{
                    "case_id": case_id,
                    "document_id": None,
                    "fact_key": "hospital_name",
                    "value_json": h_name,
                    "value_type": "text",
                    "verification_status": "verified",
                    "source_page": None,
                    "source_quote": f"Hospital name updated to '{h_name}'",
                    "confidence": 0.99,
                }],
            )
        except Exception as error:
            logger.warning("Could not update hospital_name fact for %s: %s", case_id, error)

    if "patient_relation" in updates and updates["patient_relation"]:
        p_rel = updates["patient_relation"]
        try:
            _supabase_request(
                "DELETE",
                "/rest/v1/case_facts",
                params={"case_id": f"eq.{case_id}", "fact_key": "eq.patient_relation", "document_id": "is.null"},
                headers={"Prefer": "return=minimal"},
            )
            _supabase_request(
                "POST",
                "/rest/v1/case_facts",
                headers={"Prefer": "return=minimal"},
                json=[{
                    "case_id": case_id,
                    "document_id": None,
                    "fact_key": "patient_relation",
                    "value_json": p_rel,
                    "value_type": "text",
                    "verification_status": "verified",
                    "source_page": None,
                    "source_quote": f"Patient relation updated to '{p_rel}'",
                    "confidence": 0.99,
                }],
            )
        except Exception as error:
            logger.warning("Could not update patient_relation fact for %s: %s", case_id, error)



@router.get("/{case_id}/readiness", response_model=ReadinessResponse)
async def readiness(case_id: str, authorization: str | None = Header(default=None)):
    state = await _load_state(case_id, authorization)
    view = state["view"]
    return {
        "score": view["readiness_score"],
        "missing_requirements": view["missing_requirements"],
        "verified_items": view["verified_items"],
        "next_best_action": view["next_best_action"],
        "documents_processing": sum(
            1
            for document in state["documents"]
            if document.get("processing_status") in {"uploaded", "processing"}
        ),
        "documents_failed": sum(
            1
            for document in state["documents"]
            if document.get("processing_status") == "failed"
        ),
    }


@router.get("/{case_id}/facts")
async def facts(case_id: str, authorization: str | None = Header(default=None)):
    """Extracted claim facts, each with the document and page it came from."""
    state = await _load_state(case_id, authorization)
    return {"items": state["view"]["facts"]}


@router.get("/{case_id}/policy-terms")
async def policy_terms(case_id: str, authorization: str | None = Header(default=None)):
    """Return exact-UIN product-rule candidates and their extracted provenance."""
    state = await _load_state(case_id, authorization)
    return await run_in_threadpool(get_policy_terms_for_case, state)


@router.get("/{case_id}/documents/{document_id}/bill-lines")
async def get_bill_lines(
    case_id: str,
    document_id: str,
    authorization: str | None = Header(default=None),
):
    """Return the case-owned bill's extracted rows for user review."""
    state = await _load_state(case_id, authorization)
    try:
        return await run_in_threadpool(get_bill_line_items, state, document_id)
    except PolicyAssessmentError as error:
        raise HTTPException(error.status_code, error.detail) from error


@router.put("/{case_id}/documents/{document_id}/bill-lines")
async def put_bill_lines(
    case_id: str,
    document_id: str,
    payload: BillLineItemsReviewRequest,
    authorization: str | None = Header(default=None),
):
    """Save edited bill rows and optionally confirm a reconciled complete itemisation."""
    state = await _load_state(case_id, authorization)
    try:
        return await run_in_threadpool(
            save_bill_line_items, state, document_id, payload, state["user_id"]
        )
    except PolicyAssessmentError as error:
        raise HTTPException(error.status_code, error.detail) from error


@router.get("/{case_id}/policy-assessment")
async def get_saved_policy_assessment(
    case_id: str,
    authorization: str | None = Header(default=None),
):
    """Load the newest durable policy scenario and identify stale inputs."""
    state = await _load_state(case_id, authorization)
    try:
        return await run_in_threadpool(get_policy_assessment, state)
    except PolicyAssessmentError as error:
        raise HTTPException(error.status_code, error.detail) from error


@router.post("/{case_id}/policy-assessment")
async def policy_assessment(
    case_id: str,
    payload: PolicyAssessmentRequest,
    authorization: str | None = Header(default=None),
):
    """Calculate a deterministic, case-scoped scenario from confirmed bill inputs."""
    state = await _load_state(case_id, authorization)
    try:
        return await run_in_threadpool(
            assess_policy_for_case, state, payload, state["user_id"]
        )
    except PolicyAssessmentError as error:
        raise HTTPException(error.status_code, error.detail) from error


@router.get("/{case_id}/evidence", response_model=EvidenceResponse)
async def evidence(case_id: str, authorization: str | None = Header(default=None)):
    """Evidence citations derived from the facts persisted against the case."""
    state = await _load_state(case_id, authorization)
    items = await run_in_threadpool(
        _sync_evidence_items, case_id, state["view"]["facts"], state["facts"]
    )
    return {"items": items}


def _sync_evidence_items(case_id: str, view_facts: list[dict], raw_facts: list[dict]) -> list[dict]:
    """Rebuild fact-backed evidence for the case and persist it.

    Rows that already exist are replaced so the drawer always matches the facts
    currently on file rather than whatever was written when a document first
    arrived. Chat citations (which carry no fact_id) are left alone.
    """
    items = [
        {
            "case_id": case_id,
            "fact_id": fact.get("id"),
            "claim_text": f"{fact['label']}: {_render_value(fact)}",
            "document_name": fact.get("document_name") or "Uploaded document",
            "page_number": fact.get("source_page"),
            "quote": fact.get("source_quote") or "",
            "confidence": fact.get("confidence") or 0,
        }
        for fact in view_facts
        if fact.get("source_quote")
    ]

    try:
        _supabase_request(
            "DELETE",
            "/rest/v1/evidence_items",
            params={"case_id": f"eq.{case_id}", "fact_id": "not.is.null"},
            headers={"Prefer": "return=minimal"},
        )
        if items:
            _supabase_request(
                "POST",
                "/rest/v1/evidence_items",
                headers={"Prefer": "return=minimal"},
                json=items,
            )
    except DocumentPipelineError as error:
        logger.warning("Could not persist evidence items for %s: %s", case_id, error)

    return [
        {
            "claim": item["claim_text"],
            "document_name": item["document_name"],
            "page_number": item["page_number"],
            "quote": item["quote"],
            "confidence": item["confidence"],
        }
        for item in items
    ]


def _render_value(fact: dict) -> str:
    value = fact.get("value_json")
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if value is None:
        return "not found"
    if fact.get("value_type") == "money":
        return f"INR {float(value):,.0f}"
    return str(value)
