REQUIRED = {"health_policy": 20, "hospital_estimate": 15, "admission_record": 15, "discharge_summary": 20, "identity_proof": 10}

def calculate_readiness(document_types: list[str], signed_discharge_summary: bool = False) -> tuple[int, list[str]]:
    score = sum(points for kind, points in REQUIRED.items() if kind in document_types)
    missing = [kind for kind in REQUIRED if kind not in document_types]
    if "discharge_summary" in document_types and not signed_discharge_summary:
        score -= 7
        missing.append("signed_discharge_summary")
    return max(0, min(score + 25, 100)), missing
