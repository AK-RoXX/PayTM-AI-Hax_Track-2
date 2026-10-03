from app.services.mock_claim_service import get_claim_status

def investigate_claim() -> dict:
    return get_claim_status("PX24182")
