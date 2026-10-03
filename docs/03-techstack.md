# Technology Stack

## Frontend
- Node.js 22 LTS
- Next.js 16.x, React 19.x, TypeScript 5.x
- Tailwind CSS 4.x, shadcn/ui or local components
- Axios or native fetch, Zod for client validation

## Backend
- Python 3.12
- FastAPI, Uvicorn, Pydantic v2
- PyMuPDF/pdfplumber for readable PDFs
- httpx for external APIs

## AI and orchestration
- LangGraph for a controlled typed state graph
- Sarvam AI SDK/API for STT, translation, voice and document AI
- Cognee for persistent case/policy memory and retrieval
- n8n for operational workflows

## Data
- Supabase Postgres as source of truth
- Supabase Storage for originals
- Optional pgvector; Cognee local vector/graph storage is acceptable for the hackathon

## Deployment
- Vercel for frontend
- Render/Railway/Fly.io for FastAPI
- n8n Cloud or Docker local instance

Pin working versions in lockfiles after installation. Do not spend hackathon time upgrading packages.
