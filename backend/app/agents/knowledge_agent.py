from app.services.cognee_service import recall_answer, case_dataset_name
from app.services.case_state import load_case_state

async def answer_knowledge_question(case_id: str, question: str) -> str:
    """
    Real Knowledge Agent: Uses Cognee to retrieve chunks specific to the user's
    case and synthesizes a direct answer using an LLM.
    """
    # 1. Fetch case code from the database state
    try:
        case_view = load_case_state(case_id, "system")
        case_code = case_view.get("case_code")
        if not case_code:
            return "Main aapke claim details access nahi kar pa raha hoon."
            
        dataset = case_dataset_name(case_code)
        
        # 2. Use Cognee's smart recall to search the specific policy dataset and synthesize an answer
        # We also include a global financial_knowledge dataset if it exists
        answer = await recall_answer(question, [dataset, "financial_knowledge"])
        
        if answer:
            return answer
        else:
            return "Mujhe aapki policy mein iska answer nahi mila. Kripya apna sawal thoda aur clear poochein."
            
    except Exception as e:
        return "Abhi knowledge base access karne mein dikkat aa rahi hai. Kripya thodi der baad try karein."
