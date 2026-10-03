from fastapi import APIRouter, File, Header, HTTPException, UploadFile, BackgroundTasks
from starlette.concurrency import run_in_threadpool

from app.services.document_pipeline import (
    AuthenticationError,
    CaseAccessError,
    DocumentPipelineError,
    authenticate_user,
    list_case_documents,
    process_document_upload,
)
from app.services.document_service import MAX_DOCUMENT_BYTES, validate_document

router = APIRouter(prefix="/cases/{case_id}/documents", tags=["documents"])


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


@router.get("")
async def list_documents(case_id: str, authorization: str | None = Header(default=None)):
    user_id = await _user_id(authorization)
    try:
        items = await run_in_threadpool(list_case_documents, case_id, user_id)
    except CaseAccessError as error:
        raise HTTPException(404, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error
    return {"items": items}


@router.post("")
async def upload_document(
    case_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    user_id = await _user_id(authorization)
    filename = file.filename or "uploaded-document"
    content = await file.read(MAX_DOCUMENT_BYTES + 1)
    try:
        validate_document(filename, content)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error

    try:
        return await run_in_threadpool(process_document_upload, case_id, user_id, filename, content, background_tasks)
    except CaseAccessError as error:
        raise HTTPException(404, str(error)) from error
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    except DocumentPipelineError as error:
        raise HTTPException(503, str(error)) from error
