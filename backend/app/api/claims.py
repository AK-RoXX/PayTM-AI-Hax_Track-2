"""
claims.py — claim status and drafts derived from the user's own case.

Nothing here is hardcoded: the submission reference comes from the case, and the
blocked fields are the requirements the uploaded documents have not satisfied.
"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from starlette.concurrency import run_in_threadpool

from app.services.case_state import load_case_state
from app.services.document_pipeline import (
    AuthenticationError,
    CaseAccessError,
    DocumentPipelineError,
    authenticate_user,
)

router = APIRouter(prefix="/cases/{case_id}", tags=["claims"])

PENDING_PARTY_BY_STATUS = {
    "intake": "You",
    "docs_pending": "You",
    "awaiting_hospital_verification": "Hospital",
    "submitted": "Insurer",
    "closed": "Nobody",
}

NEXT_EVENT_BY_STATUS = {
    "intake": "Create your claim details",
    "docs_pending": "Upload the remaining documents",
    "awaiting_hospital_verification": "Hospital medical-record confirmation",
    "submitted": "Insurer claim assessment",
    "closed": "Claim closed",
}


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


async def _load_view(case_id: str, authorization: str | None) -> dict:
    user_id = await _user_id(authorization)
    try:
        state = await run_in_threadpool(load_case_state, case_id, user_id)
    except CaseAccessError as error:
        raise HTTPException(404, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error
    return state["view"]


@router.get("/claim-status")
async def claim_status(case_id: str, authorization: str | None = Header(default=None)):
    view = await _load_view(case_id, authorization)
    missing = view["missing_requirements"]
    status = view["status"]
    return {
        "claim_id": view.get("case_code") or case_id,
        "case_id": view["id"],
        "status": status,
        "last_updated": view.get("updated_at"),
        "user_action_required": bool(missing),
        "pending_party": PENDING_PARTY_BY_STATUS.get(status, "You"),
        "next_expected_event": NEXT_EVENT_BY_STATUS.get(status, view["next_best_action"]),
        "next_best_action": view["next_best_action"],
        "readiness_score": view["readiness_score"],
    }


@router.post("/claim-draft")
async def claim_draft(case_id: str, authorization: str | None = Header(default=None)):
    view = await _load_view(case_id, authorization)
    missing = view["missing_requirements"]
    case_code = view.get("case_code") or case_id
    if missing:
        return {
            "claim_draft_id": f"DRAFT-{case_code}",
            "case_id": view["id"],
            "status": "blocked",
            "missing_fields": [requirement["name"] for requirement in missing],
            "message": missing[0]["reason"],
        }
    return {
        "claim_draft_id": f"DRAFT-{case_code}",
        "case_id": view["id"],
        "status": "ready",
        "missing_fields": [],
        "message": view["next_best_action"],
    }