"""
claim_facts.py — the document-to-claim data contract.

Every claim fact Sahaayak derives from an uploaded document is declared here:
the key we persist, how the value is cast, the label shown in the UI, the
document types it can come from, and the regex patterns that find it.

Provenance is part of the contract. A fact is only ever returned together with
the document it was read from, the page it appeared on, and the exact quote it
was parsed out of, so any number we show can be traced back to a page of the
user's own upload.

Regex extraction is deliberately conservative: we only claim a fact when a
pattern matches, and we never guess a value that is not on the page.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable

MONEY_PATTERN = r"[0-9][0-9,]*(?:\.[0-9]+)?"
CURRENCY = r"(?:inr|rs\.?|₹)"
# OCR keeps the label, its separator and the currency token together, and they
# appear in every order: "Sum Insured: Rs. 5,00,000", "Sum Insured Rs 500000",
# "Total Amount - 180,000". All three have to read back as the same fact.
AMOUNT = rf"\s*(?:[:=\-]\s*)*{CURRENCY}?\s*[:=]?\s*({MONEY_PATTERN})"
DATE = r"([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})"


@dataclass(frozen=True)
class FactSpec:
    """One declaratively defined claim fact."""

    key: str
    label: str
    value_type: str
    patterns: tuple[str, ...]
    confidence: float
    document_types: frozenset[str]
    cast: Callable[[str], Any] = str
    requirement_key: str | None = None
    aliases: frozenset[str] = field(default_factory=frozenset)

    def applies_to(self, document_type: str) -> bool:
        return document_type in self.document_types

    def matches(self, question: str | None = None) -> bool:
        if not question:
            return True
        haystack = question.lower()
        return self.key in haystack or self.label.lower() in haystack or any(
            alias in haystack for alias in self.aliases
        )


def _money(value: str) -> float | None:
    cleaned = re.sub(r"[^0-9.]+", "", value)
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _whole_money(value: str) -> int | None:
    amount = _money(value)
    return int(amount) if amount is not None else None


def _boolean(value: str) -> bool | None:
    normalised = value.strip().lower()
    if normalised in {"yes", "present", "true", "signed", "attested"}:
        return True
    if normalised in {"no", "absent", "false", "unsigned", "pending"}:
        return False
    return None


def _number(value: str) -> float | None:
    cleaned = re.sub(r"[^0-9.]+", "", value)
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


# Flattened OCR text runs sentences together with single spaces, so a greedy
# "Name: X" pattern happily swallows the next three labels. Every label the
# contract knows about is listed here; a captured value is cut at the first one
# that appears after it.
_LABEL_BOUNDARY = re.compile(
    r"\b(?:"
    r"sum\s+insured|insured\s+amount|coverage\s+amount|total\s+sum\s+insured|"
    r"room\s*rent|bed\s+charges?|co[\s\-]?pay(?:ment)?|deductible|"
    r"waiting\s+period|policy\s+period|valid\s+from|cover(?:age)?\s+period|"
    r"policy\s*(?:no\.?|number|id)|policy\s+holder|uin|insured\s*(?:name|person)|"
    r"name\s+of\s+insured|insurer|insurance\s+company|company\s+name|"
    r"hospital|institution|clinic|facility|centre|center|"
    r"date\s+of\s+admission|admission\s+date|admitted\s+on|"
    r"date\s+of\s+discharge|discharge\s+date|discharged\s+on|"
    r"final\s+diagnosis|diagnosis|"
    r"doctor(?:'s)?\s+signature|signed\s+by|signature\s+present|attested\s+by|"
    r"document\s+type|identity\s+(?:document|proof)|id\s+type|"
    r"estimated\s+total|total\s+bill|total\s+payable|estimated\s+amount|"
    r"final\s+bill|net\s+payable|total\s+amount|"
    r"page\s+\d+|date\b"
    r")\b",
    flags=re.I,
)

MAX_TEXT_VALUE_LENGTH = 60


def _cut_at_next_label(text: str) -> str:
    """Cut `text` where the next document label starts.

    A label only ends the current value when it reads like one: either it is
    followed by a separator (`Sum Insured:`) or it starts a new sentence
    (`. Room rent`). Without that check a hospital called "Sunrise Care
    Hospital" would be truncated at its own second word.
    """
    for boundary in _LABEL_BOUNDARY.finditer(text):
        if boundary.start() == 0:
            continue
        before = text[: boundary.start()].rstrip()
        after = text[boundary.end() :].lstrip()
        starts_sentence = before.endswith(".")
        opens_label = bool(after[:1] in {":", "-", "="})
        if starts_sentence or opens_label:
            return text[: boundary.start()]
    return text


def _trim_at_next_label(value: str) -> str:
    return _cut_at_next_label(value[:MAX_TEXT_VALUE_LENGTH]).strip(" \t,;:.-")


def _trim_quote(quote: str) -> str:
    return _cut_at_next_label(quote[: MAX_TEXT_VALUE_LENGTH * 2]).rstrip(" .,;:-")


_POLICY = "health_policy"
_ESTIMATE = "hospital_estimate"
_ADMISSION = "admission_record"
_DISCHARGE = "discharge_summary"
_IDENTITY = "identity_proof"

_HOSPITAL_NAME_PATTERNS = (
    r"(?:hospital|institution|centre|center|facility)\s*(?:name)?\s*[:\-]\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,60})",
    r"(?:name\s+of\s+(?:hospital|institution))\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,60})",
)
_ADMISSION_DATE_PATTERNS = (
    r"(?:date\s+of\s+admission|admission\s+date|admitted\s+on)\s*[:\-]?\s*" + DATE,
)
_DISCHARGE_DATE_PATTERNS = (
    r"(?:date\s+of\s+discharge|discharge\s+date|discharged\s+on)\s*[:\-]?\s*" + DATE,
)


FACT_CONTRACT: tuple[FactSpec, ...] = (
    FactSpec(
        key="policy_uin",
        label="Product UIN",
        value_type="text",
        patterns=(r"\bUIN\s*[:#-]?\s*([A-Z][A-Z0-9/-]{8,})\b",),
        confidence=0.97,
        document_types=frozenset({_POLICY}),
        aliases=frozenset({"unique identification number", "product uin"}),
    ),
    FactSpec(
        key="policy_number",
        label="Policy number",
        value_type="text",
        patterns=(r"(?:policy\s*(?:no\.?|number)|policy\s*id)\s*[:#-]?\s*([A-Za-z0-9\-/]{4,})",),
        confidence=0.96,
        document_types=frozenset({_POLICY}),
        requirement_key=_POLICY,
        aliases=frozenset({"policy no", "policy id"}),
    ),
    FactSpec(
        key="policy_holder_name",
        label="Policy holder",
        value_type="text",
        patterns=(
            r"(?:policy\s*holder|insured\s*(?:name|person)|name\s+of\s+insured)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 .'\-]{2,40})",
        ),
        confidence=0.88,
        document_types=frozenset({_POLICY}),
        aliases=frozenset({"holder", "insured name"}),
    ),
    FactSpec(
        key="insurer_name",
        label="Insurer",
        value_type="text",
        patterns=(
            r"(?:insurer|insurance\s+company|company\s+name)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,50})",
        ),
        confidence=0.85,
        document_types=frozenset({_POLICY}),
        aliases=frozenset({"insurer", "policy company"}),
    ),
    FactSpec(
        key="sum_insured",
        label="Sum insured",
        value_type="money",
        patterns=(
            r"(?:sum\s+insured|insured\s+amount|coverage\s+amount|total\s+sum\s+insured)\s*" + AMOUNT,
        ),
        confidence=0.93,
        document_types=frozenset({_POLICY}),
        cast=_whole_money,
        aliases=frozenset({"coverage", "insured amount", "policy cover"}),
    ),
    FactSpec(
        key="room_rent_limit_per_day",
        label="Room rent limit per day",
        value_type="money",
        patterns=(
            r"(?:room\s*rent|bed\s*charges?)\D{0,60}?(?:limit|up\s*to|per\s*day|cap)\D{0,40}?" + AMOUNT,
        ),
        confidence=0.90,
        document_types=frozenset({_POLICY}),
        cast=_whole_money,
        aliases=frozenset({"room rent", "room rent limit", "bed charges"}),
    ),
    FactSpec(
        key="copay_percentage",
        label="Co-payment",
        value_type="number",
        patterns=(
            r"(?:co[\s\-]?pay(?:ment)?|deductible)\D{0,30}?([0-9]{1,2}(?:\.[0-9]+)?)\s*%",
        ),
        confidence=0.84,
        document_types=frozenset({_POLICY}),
        cast=_number,
        aliases=frozenset({"copay", "co-pay", "deductible"}),
    ),
    FactSpec(
        key="waiting_period_days",
        label="Waiting period",
        value_type="number",
        patterns=(
            r"waiting\s+period\D{0,40}?([0-9]{1,4})\s*(?:days?|months?|years?)",
        ),
        confidence=0.84,
        document_types=frozenset({_POLICY}),
        cast=_number,
        aliases=frozenset({"waiting period"}),
    ),
    FactSpec(
        key="policy_period",
        label="Policy period",
        value_type="text",
        patterns=(
            r"(?:policy\s+period|valid\s+from|cover(?:age)?\s+period)\D{0,20}?" + DATE
            + r"\s*(?:to|-|till)\s*" + DATE,
        ),
        confidence=0.88,
        document_types=frozenset({_POLICY}),
        aliases=frozenset({"policy period", "policy valid", "cover period"}),
    ),
    FactSpec(
        key="hospital_name",
        label="Hospital",
        value_type="text",
        patterns=_HOSPITAL_NAME_PATTERNS,
        confidence=0.87,
        document_types=frozenset({_ESTIMATE, _ADMISSION, _DISCHARGE}),
        aliases=frozenset({"hospital", "hospital name", "where admitted"}),
    ),
    FactSpec(
        key="estimated_total_amount",
        label="Estimated total",
        value_type="money",
        patterns=(
            r"(?:estimated\s+total|total\s+bill|total\s+payable|estimated\s+amount|final\s+bill|net\s+payable|total\s+amount|total\s+charges|amount\s+payable|grand\s+total)\D{0,40}?" + AMOUNT,
        ),
        confidence=0.94,
        document_types=frozenset({_ESTIMATE}),
        cast=_whole_money,
        requirement_key=_ESTIMATE,
        aliases=frozenset({"bill amount", "total", "hospital bill", "estimate"}),
    ),
    FactSpec(
        key="admission_date",
        label="Admission date",
        value_type="date",
        patterns=_ADMISSION_DATE_PATTERNS,
        confidence=0.86,
        document_types=frozenset({_ESTIMATE, _ADMISSION, _DISCHARGE}),
        requirement_key=_ADMISSION,
        aliases=frozenset({"admission", "admitted", "admission date"}),
    ),
    FactSpec(
        key="discharge_date",
        label="Discharge date",
        value_type="date",
        patterns=_DISCHARGE_DATE_PATTERNS,
        confidence=0.86,
        document_types=frozenset({_ESTIMATE, _ADMISSION, _DISCHARGE}),
        aliases=frozenset({"discharge", "discharged", "discharge date"}),
    ),
    FactSpec(
        key="diagnosis",
        label="Diagnosis",
        value_type="text",
        patterns=(
            r"(?:final\s+diagnosis|diagnosis)\s*[:\-]\s*([A-Za-z][A-Za-z0-9 ,()\-/'.]{3,120})",
        ),
        confidence=0.86,
        document_types=frozenset({_DISCHARGE}),
        aliases=frozenset({"diagnosis", "what was diagnosed", "illness"}),
    ),
    FactSpec(
        key="doctor_signature_present",
        label="Doctor signature",
        value_type="bool",
        patterns=(
            r"(?:doctor(?:'s)?\s+signature|signed\s+by\s+(?:the\s+)?(?:doctor|consultant|physician)|signature\s+present|attested\s+by)\s*[:\-]?\s*(yes|no|present|absent|signed|unsigned)",
        ),
        confidence=0.82,
        document_types=frozenset({_DISCHARGE}),
        cast=_boolean,
        requirement_key=_DISCHARGE,
        aliases=frozenset({"signature", "signed", "doctor sign"}),
    ),
    FactSpec(
        key="identity_document_type",
        label="Identity document",
        value_type="text",
        patterns=(
            r"(?:document\s+type|identity\s+(?:document|proof)|id\s+type)\s*[:\-]\s*([A-Za-z][A-Za-z0-9 \-]{2,30})",
        ),
        confidence=0.82,
        document_types=frozenset({_IDENTITY}),
        requirement_key=_IDENTITY,
        aliases=frozenset({"id proof", "identity proof", "aadhaar", "pan"}),
    ),
)

FACT_SPECS_BY_KEY: dict[str, FactSpec] = {spec.key: spec for spec in FACT_CONTRACT}


def specs_for_document(document_type: str) -> tuple[FactSpec, ...]:
    return tuple(spec for spec in FACT_CONTRACT if spec.applies_to(document_type))


def fact_label(fact_key: str) -> str:
    spec = FACT_SPECS_BY_KEY.get(fact_key)
    return spec.label if spec else fact_key.replace("_", " ").capitalize()


def extract_claim_facts(document_type: str, pages: Iterable[dict]) -> list[dict]:
    """Read every contracted fact out of the given extracted pages.

    Returns one record per fact with the value, its type, the page it was found
    on and the exact quote it was parsed from. Nothing is inferred: if no
    pattern matches, the fact is simply absent.
    """
    page_list = [page for page in pages if (page.get("text") or "").strip()]
    if not page_list:
        return []

    facts: list[dict] = []
    seen: set[str] = set()

    for spec in specs_for_document(document_type):
        match = _first_match(spec, page_list)
        if match is None:
            continue
        value, page_number, quote = match
        if value is None or spec.key in seen:
            continue
        seen.add(spec.key)
        facts.append(
            {
                "fact_key": spec.key,
                "label": spec.label,
                "value_json": value,
                "value_type": spec.value_type,
                "verification_status": "extracted",
                "source_page": page_number,
                "source_quote": quote[:500],
                "confidence": spec.confidence,
            }
        )

    return facts


def _first_match(spec: FactSpec, pages: list[dict]) -> tuple[Any, int | None, str] | None:
    for pattern in spec.patterns:
        for page in pages:
            match = re.search(pattern, page.get("text", ""), flags=re.I | re.S)
            if not match:
                continue
            raw = match.group(1).strip()
            if spec.cast is str:
                raw = _trim_at_next_label(raw)
            if not raw:
                continue
            try:
                value = spec.cast(raw)
            except ValueError:
                continue
            if value is None or value == "":
                continue
            quote = " ".join(match.group(0).split())
            if spec.cast is str:
                quote = quote[: MAX_TEXT_VALUE_LENGTH * 2]
            return value, page.get("page_number"), _trim_quote(quote)
    return None
