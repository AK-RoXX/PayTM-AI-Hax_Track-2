from app.services.document_pipeline import _supabase_request
from app.services.case_state import record_case_event
import logging

logger = logging.getLogger(__name__)

async def request_human_handoff(case_id: str) -> str:
    """
    Real Human Handoff Agent: Updates case status to request human review
    and logs an event for the dashboard.
    """
    try:
        # 1. Update case status
        _supabase_request(
            "PATCH",
            f"/rest/v1/cases?id=eq.{case_id}",
            headers={"Prefer": "return=minimal"},
            json={"status": "human_review_requested"}
        )
        
        # 2. Record timeline event
        record_case_event(
            case_id=case_id,
            event_type="human_review_requested",
            title="User requested human assistance",
            detail="The case has been escalated to a human agent.",
            actor="user"
        )
        
        # In a real system, you might trigger an email/webhook to N8N here
        
        return "Maine ek human agent ko notify kar diya hai. Wo jald hi aapse judenge aur is case mein aapki madad karenge."
    except Exception as e:
        logger.error(f"Failed to request human handoff: {e}")
        return "Sorry, human agent connect karne mein dikkat aa rahi hai. Kripya thodi der baad try karein."
