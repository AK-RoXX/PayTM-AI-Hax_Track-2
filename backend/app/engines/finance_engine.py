def calculate_financial_gap(hospital_estimate: float, possible_coverage: float) -> float:
    return max(hospital_estimate - possible_coverage, 0)
