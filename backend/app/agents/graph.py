# LangGraph-ready orchestration facade. Add langgraph when dependency/API key setup is complete.
from app.agents.intake_agent import run_intake
from app.agents.explanation_agent import explain_case

async def run_case_graph(message: str, language: str = "hinglish") -> dict:
    intake = run_intake(message)
    return {"intake":intake, "next_best_action":"Upload a signed discharge summary", "response":explain_case(language)}
