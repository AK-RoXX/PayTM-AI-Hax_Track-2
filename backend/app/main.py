from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import cases, documents, chat, claims, integrations

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(cases.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(claims.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(integrations.callback_router, prefix="/api/v1")

@app.get("/health")
def health(): return {"status":"ok","service":settings.app_name,"demo_mode":settings.demo_mode}
