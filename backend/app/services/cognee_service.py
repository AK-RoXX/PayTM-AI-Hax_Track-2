"""
cognee_service.py — the ONLY file in the app that imports httpx to talk to Cognee.
All other modules call functions from this file.

Cognee Cloud HTTP API:
  POST /api/v1/remember   → ingest text, build graph
  POST /api/v1/search     → search (use search_type=CHUNKS for raw text)
  POST /api/v1/recall     → auto-routed smart retrieval (returns string)
  POST /api/v1/forget     → delete a dataset
"""
import asyncio
import logging
import re
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Connection ───────────────────────────────────────────────────────────────

def _client() -> httpx.AsyncClient:
    """Create a fresh async client for each request. Safe for concurrent use."""
    headers = {}
    if settings.cognee_api_key:
        headers["X-Api-Key"] = settings.cognee_api_key
    if settings.cognee_tenant_id:
        headers["X-Tenant-Id"] = settings.cognee_tenant_id
    return httpx.AsyncClient(
        base_url=settings.cognee_url,
        headers=headers,
        timeout=settings.cognee_timeout_seconds,
    )

def _is_configured() -> bool:
    return bool(settings.cognee_url and settings.cognee_api_key)


# ─── Dataset naming ──────────────────────────────────────────────────────────

def case_dataset_name(case_code: str) -> str:
    """Convert case code to a Cognee dataset name.
    MED-82031 → case_MED_82031
    Cognee dataset names must be alphanumeric + underscores.
    """
    return "case_" + re.sub(r"[^a-zA-Z0-9]", "_", case_code)


# ─── Chunk text format ────────────────────────────────────────────────────────

def _to_cognee_text(chunk: dict) -> str:
    """
    Embed chunk_id in the text so recall results can be mapped back to Supabase.
    """
    text = chunk.get("text", "")
    text = re.sub(r"\b\d{10}\b", "XXXXXX", text)           # phone
    text = re.sub(r"\b\d{4}[\s-]\d{4}[\s-]\d{4}\b", "XXXX XXXX XXXX", text)  # aadhaar
    
    return (
        f"[chunk_id={chunk['id']} | "
        f"doc={chunk.get('document_type', '')} | "
        f"page={chunk.get('page_number', '')} | "
        f"clause={chunk.get('clause_label', '')}]\n"
        f"{text}"
    )


def _extract_chunk_ids(results: list[dict]) -> list[str]:
    """Parse the chunk_id out of Cognee search results."""
    ids = []
    pattern = re.compile(r"\[chunk_id=([^\s|\]]+)")
    for r in results:
        text = r.get("text", "") or ""
        m = pattern.search(text)
        if m:
            ids.append(m.group(1))
    return ids


# ─── Indexing ─────────────────────────────────────────────────────────────────

async def index_chunks(case_code: str, chunks: list[dict]) -> None:
    if not _is_configured() or not chunks:
        return
    
    dataset_name = case_dataset_name(case_code)
    logger.info("Indexing %d chunks into Cognee dataset '%s'", len(chunks), dataset_name)
    
    try:
        async with _client() as client:
            texts = [_to_cognee_text(c) for c in chunks]
            
            # The HTTP API requires multipart/form-data for /remember
            multipart_data = [
                ("datasetName", (None, dataset_name)),
                ("run_in_background", (None, "true")),
            ]
            for t in texts:
                multipart_data.append(("raw_data", (None, t)))
            
            resp = await client.post("/api/v1/remember", files=multipart_data)
            
            if resp.status_code not in (200, 201, 202):
                logger.warning("Cognee remember returned %d for %s: %s", resp.status_code, dataset_name, resp.text[:300])
            else:
                logger.info("Cognee remember accepted for dataset '%s'", dataset_name)
    
    except Exception as exc:
        logger.warning("Cognee index_chunks failed for case %s: %s", case_code, exc)


# ─── Searching ────────────────────────────────────────────────────────────────

async def search_chunks(question: str, dataset_names: list[str], top_k: int = 5) -> list[dict]:
    if not _is_configured():
        return []
    
    try:
        async with _client() as client:
            resp = await client.post("/api/v1/search", json={
                "query": question,
                "search_type": "CHUNKS",
                "datasets": dataset_names,
                "wide_search_top_k": top_k,
            })
            
            if resp.status_code != 200:
                logger.warning("Cognee search returned %d: %s", resp.status_code, resp.text[:200])
                return []
            
            data = resp.json()
            
            # The API might return a list of datasets, each with a 'search_result' array
            chunks = []
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "search_result" in item:
                        chunks.extend(item["search_result"])
                    else:
                        chunks.append(item)
            elif isinstance(data, dict):
                if "results" in data:
                    chunks = data["results"]
                else:
                    chunks = [data]
            
            # Sort the aggregated chunks by score ascending (it's distance, lower is closer)
            chunks.sort(key=lambda x: x.get("score", 100))
            return chunks
    except Exception as exc:
        logger.warning("Cognee search failed: %s", exc)
        return []


async def recall_answer(question: str, dataset_names: list[str]) -> Optional[str]:
    if not _is_configured():
        return None
    
    try:
        async with _client() as client:
            resp = await client.post("/api/v1/recall", json={
                "query": question,
                "datasets": dataset_names,
            })
            
            if resp.status_code != 200:
                return None
            
            data = resp.json()
            if isinstance(data, str) and data.strip():
                return data
            if isinstance(data, dict):
                return data.get("answer") or data.get("text") or data.get("response")
            return None
    except Exception:
        return None


# ─── Forgetting ───────────────────────────────────────────────────────────────

async def forget_case(case_code: str) -> None:
    if not _is_configured():
        return
    dataset_name = case_dataset_name(case_code)
    try:
        async with _client() as client:
            await client.post("/api/v1/forget", json={"dataset_name": dataset_name})
    except Exception:
        pass


FINANCIAL_KNOWLEDGE_DATASET = "financial_knowledge"
POLICY_DEMO_DATASET = "policy_POL_889923"
