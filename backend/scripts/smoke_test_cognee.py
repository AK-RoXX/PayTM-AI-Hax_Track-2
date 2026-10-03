"""
Smoke test — run this BEFORE writing evidence_service.py.
It reveals the exact shape of recall() and search() output.

Usage (from backend/):
  py -m scripts.smoke_test_cognee
"""
import asyncio
import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

COGNEE_URL = os.environ.get("COGNEE_URL", "")
COGNEE_API_KEY = os.environ.get("COGNEE_API_KEY", "")

HEADERS = {
    "X-Api-Key": COGNEE_API_KEY,
    "X-Tenant-Id": "52abeb29-0f98-4d78-898d-52026184d897",
    "Content-Type": "application/json",
}

async def main():
    if not COGNEE_URL or not COGNEE_API_KEY:
        print("ERROR: COGNEE_URL and COGNEE_API_KEY environment variables must be set.")
        return

    async with httpx.AsyncClient(timeout=60, base_url=COGNEE_URL) as client:
        # ─── 1. Ingest one chunk ───
        print("=== STEP 1: remember ===")
        
        req_headers = {"X-Api-Key": COGNEE_API_KEY, "X-Tenant-Id": "52abeb29-0f98-4d78-898d-52026184d897"}
        
        # Cognee requires multipart/form-data for /remember
        multipart_data = {
            "datasetName": (None, "smoke_test"),
            "raw_data": (None, "[chunk_id=smoke-001 | doc=health_policy | page=9 | clause=]\nRoom rent expenses are payable up to Rs 5,000 per day.")
        }
        resp = await client.post(
            "/api/v1/remember", 
            files=multipart_data,
            headers=req_headers
        )
        
        print("status:", resp.status_code)
        print("body:", resp.text[:500])
        
        # ─── 2. Wait for graph build (remember is async internally) ───
        print("Waiting 15 seconds for graph build...")
        await asyncio.sleep(15)
        
        # ─── 3. recall() — high-level answer ───
        print("\n=== STEP 2: recall ===")
        resp2 = await client.post("/api/v1/recall", json={
            "query": "what is the room rent limit?",
        }, headers=HEADERS)
        print("status:", resp2.status_code)
        print("TYPE:", type(resp2.json()))
        print("RAW:", json.dumps(resp2.json(), indent=2)[:1000])
        
        # ─── 4. search() with CHUNKS — get raw text ───
        print("\n=== STEP 3: search CHUNKS ===")
        resp3 = await client.post("/api/v1/search", json={
            "query": "what is the room rent limit?",
            "search_type": "CHUNKS",
            "datasets": ["smoke_test"],
        }, headers=HEADERS)
        print("status:", resp3.status_code)
        print("TYPE:", type(resp3.json()))
        print("RAW:", json.dumps(resp3.json(), indent=2)[:2000])
        
        # ─── 5. search() with RAG_COMPLETION ───
        print("\n=== STEP 4: search RAG_COMPLETION ===")
        resp4 = await client.post("/api/v1/search", json={
            "query": "what is the room rent limit?",
            "search_type": "RAG_COMPLETION",
            "datasets": ["smoke_test"],
        }, headers=HEADERS)
        print("status:", resp4.status_code)
        print("RAW:", json.dumps(resp4.json(), indent=2)[:1000])
        
        print("\n=== DONE ===")

if __name__ == "__main__":
    asyncio.run(main())
