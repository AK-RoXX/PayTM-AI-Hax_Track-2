def get_claim_status(claim_id: str) -> dict:
    return {"claim_id": claim_id, "status": "awaiting_hospital_verification", "last_updated": "Today, 10:20 AM", "user_action_required": False, "pending_party": "Hospital", "next_expected_event": "Hospital medical-record confirmation"}
