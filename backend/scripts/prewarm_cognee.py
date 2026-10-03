"""
Prewarms the Cognee graph by sending a ping query to all datasets.
Run this right before the demo.

Usage (from backend/):
  py -m scripts.prewarm_cognee
"""
import asyncio
from app.services import cognee_service

async def prewarm():
    datasets = [cognee_service.FINANCIAL_KNOWLEDGE_DATASET, cognee_service.POLICY_DEMO_DATASET]
    print(f"Pre-warming datasets: {datasets}")
    
    results = await cognee_service.search_chunks("ping", datasets, top_k=1)
    
    if results:
        print("✅ Pre-warm successful! Found chunks.")
    else:
        print("⚠️ Pre-warm returned no results, or failed. Check logs.")

if __name__ == "__main__":
    asyncio.run(prewarm())
