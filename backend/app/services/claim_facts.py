"""
claim_facts.py — the document-to-claim data contract.

Every claim fact Sahaayak derives from an uploaded document is declared here:
the key we persist, how the value is cast, the label shown in the UI, the
document types it can come from, and the regex patterns that find it.

Provenance is part of the contract. A fact is only ever returned together with
the document it was read from, the page it appeared on, and the exact quote it
was parsed out of, so any number we show can be traced back to a page of the
user's own upload.

AI document understanding via Gemini extracts complex and varied formats,
while enhanced regex patterns provide an immediate and resilient fallback.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

MONEY_PATTERN = r"[0-9][0-9,]*(?:\.[0-9]+)?"
CURRENCY = r"(?:inr|rs\.?|₹)"
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
        if document_type in {"unknown", "all"}:
            return True
        return document_type in self.document_types

    def matches(self, question: str | None = None) -> bool:
        if not question:
            return True
        haystack = question.lower()
        return self.key in haystack or self.label.lower() in haystack or any(
            alias in haystack for alias in self.aliases
        )


def _money(value: str) -> float | None:
    cleaned = re.sub(r"[^0-9.]+", "", str(value))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _whole_money(value: str) -> int | None:
    amount = _money(value)
    return int(amount) if amount is not None else None


def _boolean(value: str | bool) -> bool | None:
    if isinstance(value, bool):
        return value
    normalised = str(value).strip().lower()
    if normalised in {"yes", "present", "true", "signed", "attested", "1"}:
        return True
    if normalised in {"no", "absent", "false", "unsigned", "pending", "0"}:
        return False
    return None


def _number(value: str) -> float | None:
    cleaned = re.sub(r"[^0-9.]+", "", str(value))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


_LABEL_BOUNDARY = re.compile(
    r"\b(?:"
    r"sum\s+insured|insured\s+amount|coverage\s+amount|total\s+sum\s+insured|"
    r"room\s*rent|bed\s+charges?|co[\s\-]?pay(?:ment)?|deductible|"
    r"waiting\s+period|policy\s+period|valid\s+from|cover(?:age)?\s+period|"
    r"policy\s*(?:no\.?|number|id)|policy\s+holder|insured\s*(?:name|person)|"
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

MAX_TEXT_VALUE_LENGTH = 80


def _cut_at_next_label(text: str) -> str:
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
    r"(?:hospital|institution|centre|center|facility|healthcare|clinic)\s*(?:name)?\s*[:\-]\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,60})",
    r"(?:name\s+of\s+(?:hospital|institution|clinic|centre|facility))\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,60})",
    r"(?:^|\n)\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,50}\s+(?:hospital|centre|center|clinic|healthcare|institute|medical\s+centre|medical\s+center|nursing\s+home))\b",
)
_ADMISSION_DATE_PATTERNS = (
    r"(?:date\s+of\s+admission|admission\s+date|admitted\s+on|d\.?o\.?a\.?|adm\s+date|date\s+of\s+adm)\s*[:\-]?\s*" + DATE,
)
_DISCHARGE_DATE_PATTERNS = (
    r"(?:date\s+of\s+discharge|discharge\s+date|discharged\s+on|d\.?o\.?d\.?|disch\s+date|date\s+of\s+disch)\s*[:\-]?\s*" + DATE,
)


FACT_CONTRACT: tuple[FactSpec, ...] = (
    FactSpec(
        key="policy_number",
        label="Policy number",
        value_type="text",
        patterns=(
            r"(?:policy\s*(?:no\.?|number|id|#)|certificate\s*no|schedule\s*no)\s*[:#-]?\s*([A-Za-z0-9\-/]{4,})",
        ),
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
            r"(?:policy\s*holder|insured\s*(?:name|person)|name\s+of\s+insured|proposer\s+name)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 .'\-]{2,40})",
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
            r"(?:insurer|insurance\s+company|company\s+name|tpa\s+name)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 &.,'\-]{2,50})",
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
            r"(?:sum\s+insured|insured\s+amount|coverage\s+amount|total\s+sum\s+insured|base\s+sum\s+insured|floater\s+sum\s+insured|sum\s+assured)\s*" + AMOUNT,
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
            r"(?:room\s*rent\s*limit|per\s*day\s*room\s*rent)\s*" + AMOUNT,
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
        document_types=frozenset({_ESTIMATE, _ADMISSION, _DISCHARGE, _POLICY}),
        aliases=frozenset({"hospital", "hospital name", "where admitted"}),
    ),
    FactSpec(
        key="estimated_total_amount",
        label="Estimated total",
        value_type="money",
        patterns=(
            r"(?:estimated\s+total|total\s+bill|total\s+payable|estimated\s+amount|final\s+bill|net\s+payable|total\s+amount|total\s+charges|amount\s+payable|grand\s+total|gross\s+total|net\s+bill|balance\s+payable|total\s+cost|package\s+rate|estimated\s+cost)\D{0,40}?" + AMOUNT,
            r"(?:total|net\s+amount|bill\s+amount)\s*[:=\-]\s*" + AMOUNT,
        ),
        confidence=0.94,
        document_types=frozenset({_ESTIMATE, _ADMISSION, _DISCHARGE}),
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
            r"(?:final\s+diagnosis|provisional\s+diagnosis|primary\s+diagnosis|diagnosis|chief\s+complaint|admitted\s+for)\s*[:\-]\s*([A-Za-z][A-Za-z0-9 ,()\-/'.]{3,120})",
        ),
        confidence=0.86,
        document_types=frozenset({_DISCHARGE, _ADMISSION, _ESTIMATE}),
        aliases=frozenset({"diagnosis", "what was diagnosed", "illness"}),
    ),
    FactSpec(
        key="doctor_signature_present",
        label="Doctor signature",
        value_type="bool",
        patterns=(
            r"(?:doctor(?:'s)?\s+signature|signed\s+by\s+(?:the\s+)?(?:doctor|consultant|physician)|signature\s+present|attested\s+by|treating\s+doctor|consultant\s+signature|authorized\s+signatory)\s*[:\-]?\s*(yes|no|present|absent|signed|unsigned|true|false)",
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
            r"\b(aadhaar(?:\s+card)?|pan(?:\s+card)?|passport|voter\s+id|driving\s+licen[cs]e)\b",
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


def extract_claim_facts(
    document_type: str,
    pages: Iterable[dict],
    filename: str = "",
    use_ai: bool = True,
) -> list[dict]:
    """Read every contracted fact out of the given extracted pages.

    Uses Gemini Document Understanding AI when configured, combined with
    deep regex heuristics to guarantee exact provenance and maximum coverage.
    """
    page_list = [page for page in pages if (page.get("text") or "").strip()]
    if not page_list:
        return []

    ai_facts: list[dict] = []
    if use_ai and settings.gemini_api_key:
        try:
            ai_facts = _extract_with_gemini(page_list, document_type, filename)
        except Exception as error:
            logger.warning("Gemini AI fact extraction encountered error: %s", error)

    regex_facts = _extract_with_regex(document_type, page_list)

    merged: dict[str, dict] = {}
    for fact in regex_facts:
        merged[fact["fact_key"]] = fact

    for fact in ai_facts:
        key = fact["fact_key"]
        merged[key] = fact

    return list(merged.values())


def _extract_with_gemini(pages: list[dict], document_type: str, filename: str) -> list[dict]:
    """Use Gemini AI to extract structured claim facts and quotes."""
    pages_text_blocks = []
    for page in pages:
        p_num = page.get("page_number") or 1
        text = (page.get("text") or "").strip()
        pages_text_blocks.append(f"--- PAGE {p_num} ---\n{text}")

    full_document_text = "\n\n".join(pages_text_blocks)
    if not full_document_text.strip():
        return []

    prompt = f"""You are an expert Health Insurance and Medical Claims AI Analyzer for Paytm Sahaayak.
Analyze the following document pages extracted from an uploaded medical or insurance document.
Filename: {filename or 'uploaded document'}
Document type hint: {document_type}

DOCUMENT TEXT:
{full_document_text[:12000]}

Extract ALL relevant medical claim facts present in the text with exact provenance:
Known fact keys to extract if available:
- policy_number (text): Policy number / ID (e.g. POL-12345)
- policy_holder_name (text): Policy holder / Insured person name
- insurer_name (text): Insurance company (e.g. Star Health, HDFC ERGO, Niva Bupa, Care Health)
- sum_insured (money/number): Sum insured amount in INR (e.g. 500000)
- room_rent_limit_per_day (money/number): Room rent per day limit in INR
- copay_percentage (number): Co-payment percentage
- waiting_period_days (number): Waiting period in days or months
- policy_period (text): Validity dates (e.g. 01/01/2024 to 31/12/2024)
- hospital_name (text): Name of hospital / clinic / medical center
- estimated_total_amount (money/number): Total estimated bill, grand total, net bill, or payable amount
- admission_date (date): Admission date (DD/MM/YYYY or YYYY-MM-DD)
- discharge_date (date): Discharge date (DD/MM/YYYY or YYYY-MM-DD)
- diagnosis (text): Disease / Diagnosis / Procedure
- doctor_signature_present (bool): true if doctor signature/attestation/stamp is present or indicated, false if unsigned
- identity_document_type (text): Aadhaar, PAN, Passport, Voter ID
- patient_name (text): Patient name

CRITICAL RULES:
1. "source_quote" MUST be a verbatim snippet from the document text where the fact was found.
2. "source_page" MUST be an integer representing the 1-based page number.
3. For money or number facts, "value" MUST be a number (float or int).
4. For boolean facts (like doctor_signature_present), "value" MUST be boolean true or false.
5. Return a valid JSON object ONLY:
{{
  "facts": [
    {{
      "fact_key": "estimated_total_amount",
      "label": "Estimated total",
      "value": 150000,
      "value_type": "money",
      "source_page": 1,
      "source_quote": "Grand Total: Rs. 1,50,000",
      "confidence": 0.95
    }}
  ]
}}
"""
    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=settings.gemini_ocr_model,
            contents=prompt,
        )
        raw_text = response.text or ""
    except Exception:
        # Fallback to direct REST API
        with httpx.Client(timeout=20) as rest_client:
            resp = rest_client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_ocr_model}:generateContent",
                params={"key": settings.gemini_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            if resp.is_error:
                return []
            raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not json_match:
        return []

    parsed = json.loads(json_match.group())
    raw_facts = parsed.get("facts", [])
    valid_facts = []

    for item in raw_facts:
        key = item.get("fact_key")
        val = item.get("value")
        if not key or val is None or val == "":
            continue

        spec = FACT_SPECS_BY_KEY.get(key)
        val_type = item.get("value_type") or (spec.value_type if spec else "text")

        # Cast appropriately
        if val_type in {"money", "number"}:
            try:
                val = float(re.sub(r"[^0-9.]+", "", str(val)))
            except (ValueError, TypeError):
                continue
        elif val_type == "bool":
            val = _boolean(val)
            if val is None:
                continue

        page_num = item.get("source_page")
        try:
            page_num = int(page_num) if page_num is not None else 1
        except (ValueError, TypeError):
            page_num = 1

        quote = str(item.get("source_quote") or "").strip()[:500]
        conf = float(item.get("confidence") or 0.92)

        valid_facts.append(
            {
                "fact_key": key,
                "label": item.get("label") or fact_label(key),
                "value_json": val,
                "value_type": val_type,
                "verification_status": "extracted",
                "source_page": page_num,
                "source_quote": quote or f"{fact_label(key)}: {val}",
                "confidence": min(max(conf, 0.5), 0.99),
            }
        )

    return valid_facts


def _extract_with_regex(document_type: str, pages: list[dict]) -> list[dict]:
    """Pattern matching fallback for all applicable specs."""
    facts: list[dict] = []
    seen: set[str] = set()

    specs = specs_for_document(document_type) if document_type not in {"unknown", "all"} else FACT_CONTRACT

    for spec in specs:
        match = _first_match(spec, pages)
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