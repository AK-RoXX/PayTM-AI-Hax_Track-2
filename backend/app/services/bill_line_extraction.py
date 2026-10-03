"""Conservative, page-cited bill line proposals for human review.

The extractor only suggests item rows. It never marks a bill complete, decides
coverage, or produces a financial calculation. Users must reconcile and confirm
the complete bill before the policy engine will use these lines.
"""
from __future__ import annotations

import re
from decimal import Decimal
from uuid import uuid4

MONEY = re.compile(r"(?<![A-Za-z0-9])(?:₹|INR\s*|Rs\.?\s*)?([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?![A-Za-z0-9])", re.I)
CURRENCY = re.compile(r"₹|\bINR\b|\bRs\.?(?=\s|$)", re.I)
QUANTITY = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:days?|nights?|qty|quantity|nos?\.?|units?)\b", re.I)
TOTAL_ROW = re.compile(
    r"\b(?:grand\s+total|net\s+payable|amount\s+payable|total\s+(?:bill|charges|amount|payable)|"
    r"estimated\s+(?:total|amount)|subtotal|sub\s+total|balance\s+due|total\s+due)\b",
    re.I,
)
ROOM = re.compile(r"\b(room\s*rent|room\s+charges?|bed\s+charges?|accommodation)\b", re.I)
ROOM_RELATED = re.compile(r"\b(boarding|dmo|rmo|cmo|rmp|nursing|ward\s+charges?)\b", re.I)
ICU = re.compile(r"\b(icu|iccu|intensive\s+(?:cardiac\s+)?care|intensivist|monitor(?:ing)?|pulse\s*oximeter)\b", re.I)
PHARMACY = re.compile(r"\b(pharmacy|medicines?|drugs?|pharmaceuticals?)\b", re.I)
CONSUMABLES = re.compile(r"\b(consumables?|surgical\s+supplies|disposables?)\b", re.I)
DIAGNOSTICS = re.compile(r"\b(diagnostics?|laboratory|lab\s+tests?|x[\s-]?ray|mri|ct\s+scan|ultrasound|pathology)\b", re.I)
IMPLANTS = re.compile(r"\b(implants?|prosthe[st]ics?|medical\s+devices?)\b", re.I)
OTHER_MEDICAL = re.compile(r"\b(consultation|surgeon|operation|procedure|nursing|treatment|medical)\b", re.I)


def _category(description: str) -> str:
    for pattern, category in (
        (ROOM, "room_rent"),
        (ROOM_RELATED, "room_related"),
        (ICU, "icu"),
        (PHARMACY, "pharmacy"),
        (CONSUMABLES, "consumables"),
        (DIAGNOSTICS, "diagnostics"),
        (IMPLANTS, "implants_devices"),
        (OTHER_MEDICAL, "other_medical"),
    ):
        if pattern.search(description):
            return category
    return "unclassified"


def _parse_candidate(line: str, page_number: int | None) -> dict | None:
    normalized = " ".join(line.replace("|", " ").split()).strip(" -:;•\t")
    if len(normalized) < 4 or len(normalized) > 700 or TOTAL_ROW.search(normalized):
        return None
    if re.fullmatch(r"(?:page\s*)?\d{1,3}", normalized, re.I):
        return None

    matches = list(MONEY.finditer(normalized))
    if not matches:
        return None

    # A currency-prefixed amount is a strong signal. Otherwise only accept
    # grouped/decimal amounts or a single large value on a recognisable charge
    # description; this avoids treating dates, IDs, and page numbers as bills.
    explicit_currency = bool(CURRENCY.search(normalized))
    currency_amounts = [match for match in matches if CURRENCY.search(match.group(0))]
    grouped_or_decimal = [
        match for match in matches
        if "," in match.group(1) or "." in match.group(1)
    ]
    if explicit_currency:
        amount_match = currency_amounts[-1] if currency_amounts else matches[-1]
    elif len(grouped_or_decimal) == 1:
        amount_match = grouped_or_decimal[0]
    elif len(matches) == 1 and (ROOM.search(normalized) or ROOM_RELATED.search(normalized) or ICU.search(normalized)):
        amount_match = matches[0]
    else:
        return None

    raw_amount = amount_match.group(1).replace(",", "")
    try:
        amount = Decimal(raw_amount)
    except Exception:
        return None
    if amount <= 0 or amount > Decimal("100000000"):
        return None

    description = (normalized[: amount_match.start()] + " " + normalized[amount_match.end() :]).strip()
    description = re.sub(r"[₹|]+", " ", description)
    description = re.sub(r"\b(?:INR|Rs\.?|amount|rate)\b", " ", description, flags=re.I)
    description = " ".join(description.split()).strip(" -:;•")
    if not description or not re.search(r"[A-Za-z\u0900-\u097F]", description):
        return None

    category = _category(description)
    qty_match = QUANTITY.search(description)
    quantity = Decimal(qty_match.group(1)) if qty_match and category in {"room_rent", "room_related", "icu"} else None
    confidence = Decimal("0.70") if explicit_currency else Decimal("0.52")
    return {
        "line_id": str(uuid4()),
        "description": description[:180],
        "category": category,
        "amount": int(amount) if amount == amount.to_integral_value() else float(amount),
        "quantity": float(quantity) if quantity is not None else None,
        "source_page": int(page_number or 1),
        "source_quote": normalized[:500],
        "confidence": float(confidence),
        "extraction_status": "proposed",
    }


def extract_bill_line_proposals(pages: list[dict]) -> list[dict]:
    """Propose charge rows only when one amount can be tied to a text line."""
    proposals = []
    seen: set[tuple[int, str, str]] = set()
    for page in pages:
        page_number = page.get("page_number")
        for line in re.split(r"[\r\n]+", page.get("text") or ""):
            proposal = _parse_candidate(line, page_number)
            if not proposal:
                continue
            key = (
                proposal["source_page"],
                re.sub(r"\W+", "", proposal["description"].lower()),
                str(proposal["amount"]),
            )
            if key in seen:
                continue
            seen.add(key)
            proposals.append(proposal)
            if len(proposals) >= 100:
                return proposals
    return proposals
