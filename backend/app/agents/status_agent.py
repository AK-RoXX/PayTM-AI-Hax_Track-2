from app.services.case_state import load_case_state

def investigate_claim(case_id: str, user_id: str = "system") -> dict:
    case_view = load_case_state(case_id, user_id)
    
    missing_docs = []
    for req in case_view.get("requirements", []):
        if req.get("status") == "missing":
            missing_docs.append(req.get("label"))
            
    readiness = case_view.get("readiness_score", 0)
    
    if readiness == 100:
        message = "Aapka claim 100% ready hai! All documents are verified and sent to the insurer."
    elif missing_docs:
        docs_str = ", ".join(missing_docs)
        message = f"Aapka claim {readiness}% ready hai. Humein aur documents chahiye: {docs_str}. Kripya inko upload karein."
    else:
        message = f"Aapka claim processing mein hai. Readiness score: {readiness}%."
        
    return {
        "status": case_view.get("status", "unknown"),
        "message": message,
        "readiness_score": readiness,
        "missing_documents": missing_docs,
        "financial_estimate": case_view.get("financial_map", {})
    }
