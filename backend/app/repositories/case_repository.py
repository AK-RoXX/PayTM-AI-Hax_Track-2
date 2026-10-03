from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

from app.seed.demo_case import DEMO_CASE, DEMO_CASE_ID, DEMO_DOCUMENTS, DEMO_EVIDENCE


class CaseRepository:
    def __init__(self):
        self._cases = {DEMO_CASE_ID: deepcopy(DEMO_CASE)}
        self._documents = {DEMO_CASE_ID: deepcopy(DEMO_DOCUMENTS)}

    def get_case(self, case_id: str):
        case = self._cases.get(case_id)
        return deepcopy(case) if case else None

    def get_documents(self, case_id: str):
        return deepcopy(self._documents.get(case_id, []))

    def add_document(self, case_id: str, filename: str, document_type: str):
        item = {
            "id": str(uuid4()),
            "case_id": case_id,
            "document_type": document_type,
            "filename": filename,
            "status": "uploaded",
            "extracted_facts": {},
            "evidence": [],
        }
        self._documents.setdefault(case_id, []).append(item)
        return deepcopy(item)

    def evidence(self, case_id: str):
        return deepcopy(DEMO_EVIDENCE) if case_id == DEMO_CASE_ID else []

    def add_event(self, title: str, detail: str):
        case = self._cases.get(DEMO_CASE_ID)
        if not case:
            return None
        event = {
            "id": str(uuid4()),
            "title": title,
            "detail": detail,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "status": "complete",
        }
        case["timeline"].append(event)
        return deepcopy(event)


case_repository = CaseRepository()