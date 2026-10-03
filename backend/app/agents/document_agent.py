from app.services.document_service import classify_document, extract_demo_facts

def process_document(filename: str) -> dict:
    kind = classify_document(filename)
    return {"document_type":kind, "status":"needs_review" if kind == "discharge_summary" else "extracted", "facts":extract_demo_facts(kind)}
