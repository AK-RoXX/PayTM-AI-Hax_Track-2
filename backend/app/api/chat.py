"""
chat.py — claim assistance backed by the user's own case.

The case is loaded from Supabase for the signed-in user, the question is answered
only from chunks belonging to that case, and both the question and the cited
evidence are written back to the case so the review page can show them.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from starlette.concurrency import run_in_threadpool

from app.schemas.actions import ChatRequest
from app.services.case_state import load_case_state
from app.services.document_pipeline import (
    AuthenticationError,
    CaseAccessError,
    DocumentPipelineError,
    _supabase_request,
    authenticate_user,
)
from app.services.evidence_service import (
    ABSTAIN_RESULT,
    EvidenceResult,
    build_status_answer,
    classify_question,
    find_evidence,
)

router = APIRouter(prefix="/cases/{case_id}", tags=["assistant"])
logger = logging.getLogger(__name__)

ABSTAIN_MESSAGE = (
    "Main aapke uploaded documents mein is sawaal ka verified jawab nahi dhundh paaya. "
    "Agar aapne abhi documents upload nahi kiye hain, please upload karein. "
    "I couldn't verify this from your uploaded documents — please check with your insurer directly."
)


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


import time
RATE_LIMITS = {}

@router.post("/ask")
async def ask(
    case_id: str,
    payload: ChatRequest,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
):
    user_id = await _user_id(authorization)
    
    # Rate limit check (max 10 requests per minute per user)
    now = time.time()
    user_requests = RATE_LIMITS.get(user_id, [])
    user_requests = [t for t in user_requests if now - t < 60]
    if len(user_requests) >= 10:
        raise HTTPException(429, "Rate limit exceeded. Please wait a minute before sending more messages.")
    user_requests.append(now)
    RATE_LIMITS[user_id] = user_requests
    try:
        state = await run_in_threadpool(load_case_state, case_id, user_id)
    except CaseAccessError as error:
        raise HTTPException(404, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error

    view = state["view"]

    msg = payload.message.strip()
    if not msg:
        raise HTTPException(400, "Message cannot be empty.")
    if len(msg) > 1000:
        raise HTTPException(400, "Message is too long (maximum 1000 characters).")

    from app.config import settings
    if settings.use_intent_router:
        from app.agents.intent_router import handle_message
        try:
            return await handle_message(case_id, msg, state)
        except Exception as e:
            logger.error("Intent router failed, falling back to legacy classification: %s", e)

    if classify_question(msg) == "status_question":
        result: EvidenceResult | None = build_status_answer(view)
    else:
        result = await find_evidence(
            question=msg,
            case_id=case_id,
            case_code=view.get("case_code") or case_id,
            language=payload.language,
        )

    if result is ABSTAIN_RESULT:
        answer, abstained, evidence_items = ABSTAIN_MESSAGE, True, []
    else:
        answer, abstained = result.answer, False
        evidence_items = _to_evidence_items(result)

    background_tasks.add_task(
        _persist_conversation, case_id, payload, answer, abstained, evidence_items, result
    )

    return {
        "answer": answer,
        "abstained": abstained,
        "evidence": evidence_items,
        "source": result.source if result else "abstained",
        "next_best_action": view["next_best_action"],
        "readiness_score": view["readiness_score"],
    }


def _to_evidence_items(result: EvidenceResult) -> list[dict]:
    if not result.quote:
        return []
    return [
        {
            "claim": result.answer[:160],
            "document_name": result.document_name,
            "page_number": result.page_number,
            "section": result.section or "",
            "quote": result.quote,
            "confidence": result.confidence,
        }
    ]


def _persist_conversation(
    case_id: str,
    payload: ChatRequest,
    answer: str,
    abstained: bool,
    evidence_items: list[dict],
    result: EvidenceResult | None,
) -> None:
    evidence_json = [
        {
            "document_name": item["document_name"],
            "page_number": item["page_number"],
            "quote": item["quote"],
            "confidence": item["confidence"],
        }
        for item in evidence_items
    ]
    try:
        _supabase_request(
            "POST",
            "/rest/v1/messages",
            headers={"Prefer": "return=minimal"},
            json=[
                {
                    "case_id": case_id,
                    "role": "user",
                    "content": payload.message,
                    "language": payload.language,
                },
                {
                    "case_id": case_id,
                    "role": "assistant",
                    "content": answer,
                    "language": payload.language,
                    "abstained": abstained,
                    "evidence_json": evidence_json,
                },
            ],
        )
        if result and result.quote:
            _supabase_request(
                "POST",
                "/rest/v1/evidence_items",
                headers={"Prefer": "return=minimal"},
                json=[
                    {
                        "case_id": case_id,
                        "chunk_id": result.chunk_id,
                        "claim_text": result.answer[:200],
                        "document_name": result.document_name,
                        "page_number": result.page_number,
                        "quote": result.quote,
                        "confidence": result.confidence,
                    }
                ],
            )
    except DocumentPipelineError as error:
        logger.warning("Could not persist conversation for %s: %s", case_id, error)