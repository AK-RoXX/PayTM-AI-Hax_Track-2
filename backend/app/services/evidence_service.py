"""
evidence_service.py — grounded answers from the user's own uploaded documents.

Retrieval is scoped to a single case. Chunks are ranked by embedding similarity
against that case only, so an answer can never be built from another user's
documents. Every answer must quote a retrieved chunk verbatim; if the quote
cannot be found in the chunk the answer is discarded and the assistant abstains.
"""
from __future__ import annotations

import json
import logging
import math
import re
from dataclasses import dataclass
from typing import Iterable, Optional

import httpx
from starlette.concurrency import run_in_threadpool as _run_in_threadpool

from app.config import settings
from app.services import cognee_service
from app.services.document_pipeline import DocumentPipelineError, _supabase_request

logger = logging.getLogger(__name__)

TOP_K = 5
MIN_SIMILARITY = 0.15
MAX_ANSWER_CONTEXT = 4


@dataclass
class EvidenceResult:
    answer: str
    quote: str
    page_number: Optional[int]
    document_name: str
    section: str
    confidence: float
    source: str
    chunk_id: str | None = None
    case_id: str | None = None


ABSTAIN_RESULT = None


def _verify_quote(quote: str, chunk_text: str) -> bool:
    norm = lambda s: " ".join(s.lower().split())
    return norm(quote) in norm(chunk_text)


QUESTION_TYPES = {
    "policy_question": ["cover", "covered", "policy", "room", "rent", "limit", "claim", "waiting", "exclusion", "inpatient", "discharge", "hospitalization"],
    "definition_question": ["what is", "kya hai", "matlab", "meaning", "define", "explain"],
    "status_question": ["pending", "stuck", "status", "update", "kab", "when", "why is my"],
    "loan_question": ["loan", "borrow", "emi", "interest", "apr", "credit"],
}


def classify_question(question: str) -> str:
    q = question.lower()
    for qtype, keywords in QUESTION_TYPES.items():
        if any(k in q for k in keywords):
            return qtype
    return "policy_question"


HINGLISH_GLOSSARY = {
    "room rent cover hoga": "is room rent covered",
    "room rent cover": "room rent coverage",
    "kitna milega": "how much will I get",
    "claim kaise kare": "how to file a claim",
    "discharge summary": "discharge summary",
    "policy cover karti hai": "what does the policy cover",
    "dental cover": "dental treatment coverage",
    "waiting period": "waiting period",
    "pre-existing": "pre-existing disease",
    "cashless hospital": "cashless hospital network",
}


def _translate_to_english(text: str) -> str:
    result = text.lower()
    for hindi, english in HINGLISH_GLOSSARY.items():
        result = result.replace(hindi, english)
    return result


# ── Case-scoped retrieval ───────────────────────────────────────────────────


def fetch_case_chunks(case_id: str, limit: int = 400) -> list[dict]:
    """Every embedded chunk belonging to one case, with its document name."""
    response = _supabase_request(
        "GET",
        "/rest/v1/chunks",
        params={
            "case_id": f"eq.{case_id}",
            "select": "id,document_id,page_number,clause_label,text,embedding_384,documents(file_name,document_type)",
            "order": "chunk_index.asc",
            "limit": str(limit),
        },
    )
    chunks = []
    for row in response.json():
        document = row.get("documents") or {}
        if isinstance(document, list):
            document = document[0] if document else None
        document = document or {}
        chunks.append(
            {
                "id": row["id"],
                "document_id": row.get("document_id"),
                "text": row.get("text") or "",
                "page_number": row.get("page_number"),
                "clause_label": row.get("clause_label") or "",
                "document_name": document.get("file_name") or "Uploaded document",
                "document_type": document.get("document_type") or "",
                "embedding": row.get("embedding_384"),
            }
        )
    return chunks


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    left = list(left or [])
    right = list(right or [])
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if not left_norm or not right_norm:
        return 0.0
    return dot / (left_norm * right_norm)


def rank_case_chunks(question: str, case_id: str, top_k: int = TOP_K) -> list[dict]:
    """Rank the case's own chunks against the question by embedding similarity."""
    from app.services.document_pipeline import embed_texts

    try:
        chunks = fetch_case_chunks(case_id)
    except DocumentPipelineError as error:
        logger.warning("Could not read chunks for case %s: %s", case_id, error)
        return []
    if not chunks:
        return []

    query_vector = embed_texts([question])[0]
    scored = []
    for chunk in chunks:
        similarity = cosine_similarity(query_vector, chunk["embedding"])
        if similarity <= MIN_SIMILARITY:
            continue
        scored.append({**chunk, "confidence": round(min(similarity, 1.0), 3)})
    scored.sort(key=lambda chunk: chunk["confidence"], reverse=True)
    return scored[:top_k]


def _pgvector_search(question: str, case_id: str, top_k: int = TOP_K) -> list[dict]:
    """Case-scoped chunk retrieval. Blocking: run it in a worker thread."""
    return rank_case_chunks(question, case_id, top_k)


# ── Answer generation ───────────────────────────────────────────────────────


async def _generate_answer(question: str, chunks: list[dict]) -> Optional[dict]:
    if not settings.gemini_api_key:
        chunk = chunks[0]
        return {
            "answer": chunk.get("text", ""),
            "quote": chunk.get("text", ""),
            "chunk_id": chunk.get("id", ""),
        }

    context_parts = []
    for i, c in enumerate(chunks[:MAX_ANSWER_CONTEXT]):
        context_parts.append(
            f"[Source {i+1}: {c.get('document_name', 'document')} p.{c.get('page_number', '?')}]\n"
            f"{c.get('text', '')}"
        )
    context = "\n\n".join(context_parts)

    prompt = f"""You are an insurance claim assistant. Answer the question ONLY using the provided document excerpts.

RULES:
1. Quote the exact relevant sentence from one of the sources.
2. If the answer is not in the sources, say "not_found".
3. Return JSON: {{"answer": "<explanation>", "quote": "<exact quote from source>", "source_index": <1-{min(len(chunks), MAX_ANSWER_CONTEXT)}>}}

Question: {question}

Sources:
{context}

JSON response:"""

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_ocr_model}:generateContent",
                params={"key": settings.gemini_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )

            if resp.status_code != 200:
                return None

            raw = resp.json()
            text = raw["candidates"][0]["content"]["parts"][0]["text"]

            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if not json_match:
                return None

            result = json.loads(json_match.group())

            if result.get("answer") == "not_found" or not result.get("quote"):
                return None

            src_idx = result.get("source_index", 1) - 1
            chunk_id = chunks[src_idx]["id"] if 0 <= src_idx < len(chunks) else chunks[0]["id"]
            result["chunk_id"] = chunk_id

            return result
    except Exception as exc:
        logger.warning("LLM answer generation failed: %s", exc)
        return None


# ── Orchestration ───────────────────────────────────────────────────────────


async def find_evidence(
    question: str,
    case_id: str,
    case_code: str,
    language: str = "hinglish",
) -> Optional[EvidenceResult]:
    search_query = _translate_to_english(question) if language == "hinglish" else question

    from app.services.pii_service import redact_pii

    search_query = redact_pii(search_query)

    cognee_chunks = await _cognee_chunks(search_query, case_id, case_code)
    source = "cognee" if cognee_chunks else "case_documents"
    chunks_for_answer = cognee_chunks or await _run_in_threadpool(
        _pgvector_search, search_query, case_id
    )

    if not chunks_for_answer:
        logger.info("No case-scoped chunks found for %s", case_id)
        return ABSTAIN_RESULT

    llm_result = await _generate_answer(search_query, chunks_for_answer)
    if not llm_result:
        return ABSTAIN_RESULT

    quote = llm_result.get("quote", "")
    chunk_id = llm_result.get("chunk_id", "")

    matching_chunk = next(
        (c for c in chunks_for_answer if c["id"] == chunk_id),
        chunks_for_answer[0] if chunks_for_answer else None,
    )

    if not matching_chunk or not quote:
        return ABSTAIN_RESULT

    if not _verify_quote(quote, matching_chunk.get("text", "")):
        logger.info("Discarded answer: quote was not present in the cited chunk.")
        return ABSTAIN_RESULT

    return EvidenceResult(
        answer=llm_result.get("answer", quote),
        quote=quote,
        page_number=matching_chunk.get("page_number"),
        document_name=matching_chunk.get("document_name", ""),
        section=matching_chunk.get("clause_label", ""),
        confidence=float(matching_chunk.get("confidence", 0.85)),
        source=source,
        chunk_id=matching_chunk.get("id"),
        case_id=case_id,
    )


async def _cognee_chunks(question: str, case_id: str, case_code: str) -> list[dict]:
    """Cognee index lookup, hydrated back to real chunk rows for this case.

    Cognee only decides *which* chunk ids to look at. The rows are re-read from
    `chunks` scoped to `case_id`, so an id from any other case — or from a shared
    dataset — is dropped instead of being cited.
    """
    cognee_results = await cognee_service.search_chunks(
        question=question, dataset_names=_datasets(case_code), top_k=TOP_K
    )
    if not cognee_results:
        return []
    chunk_ids = cognee_service._extract_chunk_ids(cognee_results)
    if not chunk_ids:
        return []
    return await _fetch_chunks_by_ids(chunk_ids, case_id)


def _datasets(case_code: str) -> list[str]:
    return [
        cognee_service.case_dataset_name(case_code),
        cognee_service.FINANCIAL_KNOWLEDGE_DATASET,
    ]


async def _fetch_chunks_by_ids(chunk_ids: list[str], case_id: str) -> list[dict]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return []
    if not case_id:
        return []
    try:
        response = _supabase_request(
            "GET",
            "/rest/v1/chunks",
            params={
                "id": "in.(" + ",".join(chunk_ids[:10]) + ")",
                "case_id": f"eq.{case_id}",
                "select": "id,document_id,text,page_number,clause_label,documents(file_name,document_type)",
            },
        )
        chunks = []
        for row in response.json():
            if row.get("case_id") not in (None, case_id):
                continue
            document = row.get("documents") or {}
            if isinstance(document, list):
                document = document[0] if document else None
            document = document or {}
            chunks.append(
                {
                    "id": row["id"],
                    "document_id": row.get("document_id"),
                    "text": row.get("text", ""),
                    "page_number": row.get("page_number"),
                    "clause_label": row.get("clause_label", ""),
                    "document_name": document.get("file_name", ""),
                    "document_type": document.get("document_type", ""),
                    "confidence": 0.9,
                }
            )
            
        # Re-order chunks to match the provided chunk_ids ranking
        chunk_map = {c["id"]: c for c in chunks}
        ordered_chunks = [chunk_map[cid] for cid in chunk_ids if cid in chunk_map]
        return ordered_chunks
    except Exception as exc:
        logger.warning("_fetch_chunks_by_ids failed: %s", exc)
        return []


def build_status_answer(view: dict) -> EvidenceResult:
    """Answer a status question from the recomputed case state, not a template."""
    score = view["readiness_score"]
    missing = view["missing_requirements"]
    if missing:
        first = missing[0]
        answer = (
            f"Your claim is {score}% ready. The next thing needed is the "
            f"{first['name'].lower()}: {first['reason']}"
        )
    else:
        answer = (
            f"Your claim is {score}% ready and nothing is missing. "
            f"{view['next_best_action']}"
        )
    return EvidenceResult(
        answer=answer,
        quote="",
        page_number=None,
        document_name="",
        section="Case status",
        confidence=1.0,
        source="case_state",
        case_id=view.get("id"),
    )