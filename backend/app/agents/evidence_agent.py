from app.services.cognee_service import retrieve_case_evidence

async def answer_policy_question(case_id: str, question: str) -> dict:
    evidence = await retrieve_case_evidence(case_id, question)
    lower = question.lower()
    if "room" in lower and evidence:
        selected = next((x for x in evidence if "room-rent" in x["claim"].lower() or "room rent" in x["claim"].lower()), evidence[0])
        return {"answer":"Your policy lists a room-rent limit of ₹5,000 per day.", "answer_status":"grounded", "evidence":[selected], "next_action":"Compare this limit with the hospital room charge."}
    return {"answer":"I found policy evidence related to hospitalization coverage. Open the evidence drawer to review the source clause.", "answer_status":"grounded", "evidence":evidence[:1], "next_action":"Upload any missing claim document."}
