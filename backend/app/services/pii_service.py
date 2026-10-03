import re
import logging

logger = logging.getLogger(__name__)

# Regex patterns for strictly formatted PII in Indian context
PII_PATTERNS = {
    "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b",
    # Indian mobile numbers: optional +91 or 91, optional space/dash, followed by 10 digits starting with 6-9
    "PHONE": r"(?<!\d)(?:\+?91[\-\s]?)?[6789]\d{9}(?!\d)",
    # Aadhaar: 12 digits, optionally separated by space or dash every 4 digits
    "AADHAAR": r"(?<!\d)\d{4}[\-\s]?\d{4}[\-\s]?\d{4}(?!\d)",
    # PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    "PAN": r"\b[A-Z]{5}\d{4}[A-Z]\b",
    # Credit Card: 16 digits (simple check)
    "CREDIT_CARD": r"(?<!\d)(?:\d[ \-]*?){13,16}(?!\d)",
}

def redact_pii(text: str) -> str:
    """
    Scans the input text and redacts common PII (Email, Phone, Aadhaar, PAN, Credit Card)
    by replacing them with placeholders like [EMAIL], [PHONE], etc.
    """
    if not text:
        return text
    
    redacted_text = text
    for entity_type, pattern in PII_PATTERNS.items():
        # Using re.IGNORECASE for email, others are strictly formatted
        flags = re.IGNORECASE if entity_type == "EMAIL" else 0
        redacted_text = re.sub(pattern, f"[{entity_type}]", redacted_text, flags=flags)
        
    return redacted_text
