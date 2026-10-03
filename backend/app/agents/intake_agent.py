import re

AMOUNT_PATTERN = re.compile(r"(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?", re.I)

RELATION_KEYWORDS = (
    ("mother", ("mother", "mummy", "mom", "maa", "maa ji")),
    ("father", ("father", "papa", "dad", "baba")),
    ("spouse", ("wife", "husband", "spouse")),
    ("child", ("son", "daughter", "child", "kid", "beti", "beta")),
)


def extract_estimated_bill(message: str) -> int | None:
    """Read a bill amount out of an intake message, or None if there isn't one.

    We never guess: a claim created without a stated amount stays unestimated
    until a document supplies one.
    """
    match = AMOUNT_PATTERN.search(message.lower())
    if not match:
        return None
    number, unit = match.groups()
    try:
        value = float(number)
    except ValueError:
        return None
    if unit in {"lakh", "lac"}:
        value *= 100000
    elif unit == "k":
        value *= 1000
    return int(value)


def extract_patient_relation(message: str) -> str:
    lowered = message.lower()
    for relation, keywords in RELATION_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return relation
    return "self"


def run_intake(message: str) -> dict:
    lowered = message.lower()
    return {
        "intent": "medical_claim_assistance",
        "urgency": "high" if any(x in lowered for x in ["hospital", "admit", "emergency"]) else "normal",
        "patient_relation": extract_patient_relation(message),
        "estimated_bill_amount": extract_estimated_bill(message),
        "language": "hinglish",
    }