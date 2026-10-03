"""
integrations.py — n8n reminders and callbacks, persisted against the real case.

Reminder and callback events are written to `case_events` for the case they
belong to, so they show up on the claim's timeline instead of a seeded demo.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.schemas.actions import ReminderRequest
from app.services.case_state import record_case_event
from app.services.document_pipeline import (
    AuthenticationError,
    CaseAccessError,
    DocumentPipelineError,
    authenticate_user,
)
from app.services.n8n_service import trigger_workflow

router = APIRouter(prefix="/cases/{case_id}", tags=["integrations"])
callback_router = APIRouter(prefix="/integrations", tags=["integrations"])
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


@router.post("/reminders")
async def set_reminder(
    case_id: str,
    payload: ReminderRequest,
    authorization: str | None = Header(default=None),
):
    user_id = await _user_id(authorization)
    try:
        await run_in_threadpool(_assert_owner, case_id, user_id)
    except CaseAccessError as error:
        raise HTTPException(404, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error

    from app.services.case_state import load_case_state

    state = await run_in_threadpool(load_case_state, case_id, user_id)
    next_action = state["view"]["next_best_action"]

    result = await trigger_workflow(
        {
            "event_type": payload.action,
            "case_id": case_id,
            "delay_minutes": payload.delay_minutes,
            "message": next_action,
        }
    )
    record_case_event(
        case_id,
        "reminder_scheduled",
        "Reminder scheduled",
        f"We will remind you: {next_action}",
        actor="n8n" if result.get("mode") != "demo" else "system",
    )
    return {"workflow": result, "case_id": case_id, "next_best_action": next_action}


def _assert_owner(case_id: str, user_id: str) -> None:
    from app.services.case_state import fetch_case_row

    fetch_case_row(case_id, user_id)


@callback_router.post("/n8n/callback")
async def n8n_callback(payload: dict, x_sahaayak_secret: str = ""):
    if x_sahaayak_secret and x_sahaayak_secret != settings.n8n_callback_secret:
        raise HTTPException(401, "Invalid callback secret")

    case_id = payload.get("case_id")
    if not case_id:
        logger.warning("n8n callback arrived without a case_id; nothing recorded.")
        return {"ok": False, "error": "case_id is required"}

    title = payload.get("title", "Automation update")
    detail = payload.get("detail", "Workflow completed.")
    record_case_event(case_id, payload.get("event_type", "workflow_update"), title, detail, actor="n8n")
    return {"ok": True, "case_id": case_id, "title": title}