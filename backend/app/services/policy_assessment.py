"""Case-scoped policy matching and input validation for the policy engine."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.engines.policy_engine import (
    calculate_policy_scenario,
    find_policy_terms,
    make_rule_summary,
    normalise_uin,
    resolve_policy_terms,
)
from app.schemas.policy import PolicyAssessmentRequest

CONFIDENCE_FLOOR = 0.90


class PolicyAssessmentError(Exception):
    def __init__(self, detail: str, status_code: int = 422):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def _document_facts(facts: list[dict], document_id: str, fact_key: str) -> list[dict]:
    return [
        fact
        for fact in facts
        if fact.get("document_id") == document_id and fact.get("fact_key") == fact_key
    ]


def _confident_value(facts: list[dict], document_id: str, fact_key: str) -> dict | None:
    candidates = [
        fact
        for fact in _document_facts(facts, document_id, fact_key)
        if float(fact.get("confidence") or 0) >= CONFIDENCE_FLOOR
        and fact.get("verification_status") not in {"conflict", "needs_review"}
        and fact.get("value_json") not in (None, "")
    ]
    if not candidates:
        return None
    values = {str(fact.get("value_json")).strip() for fact in candidates}
    if len(values) != 1:
        return None
    return max(candidates, key=lambda fact: float(fact.get("confidence") or 0))


def _amount_fact(fact: dict | None) -> int | None:
    if not fact:
        return None
    try:
        amount = Decimal(str(fact.get("value_json")))
        if amount <= 0 or amount != amount.to_integral_value():
            return None
        return int(amount)
    except Exception:
        return None


def _fact_evidence(fact: dict | None, document_name: str) -> dict | None:
    if not fact:
        return None
    return {
        "fact_key": fact.get("fact_key"),
        "value": fact.get("value_json"),
        "document_id": fact.get("document_id"),
        "document_name": document_name,
        "page_number": fact.get("source_page"),
        "quote": fact.get("source_quote") or "",
        "confidence": float(fact.get("confidence") or 0),
    }


def _all_policy_candidates(state: dict) -> list[dict[str, Any]]:
    candidates = []
    documents = [
        document
        for document in state.get("documents", [])
        if document.get("document_type") == "health_policy"
    ]
    for document in documents:
        document_id = document.get("id")
        if document.get("processing_status") != "done":
            candidates.append(
                {
                    "status": "document_not_ready",
                    "policy_document_id": document_id,
                    "document_name": document.get("file_name") or "Uploaded policy",
                    "next_step": "Wait for this policy document to finish processing.",
                }
            )
            continue

        uin_fact = _confident_value(state.get("facts", []), document_id, "policy_uin")
        sum_insured_fact = _confident_value(state.get("facts", []), document_id, "sum_insured")
        document_name = document.get("file_name") or "Uploaded policy"
        base = {
            "policy_document_id": document_id,
            "document_name": document_name,
            "policy_uin_evidence": _fact_evidence(uin_fact, document_name),
            "sum_insured_evidence": _fact_evidence(sum_insured_fact, document_name),
            "requires_schedule_confirmation": True,
        }
        if not uin_fact:
            candidates.append(
                {
                    **base,
                    "status": "policy_uin_needs_review",
                    "next_step": "Confirm the insurer product and UIN from the policy schedule.",
                }
            )
            continue

        uin = str(uin_fact.get("value_json", "")).strip()
        terms = find_policy_terms(uin)
        if terms is None:
            candidates.append(
                {
                    **base,
                    "status": "product_rules_not_in_catalog",
                    "policy_uin": uin,
                    "next_step": "The UIN was read, but no reviewed numeric rule set is available. Use the cited document evidence only.",
                }
            )
            continue

        sum_insured = _amount_fact(sum_insured_fact)
        if sum_insured is None:
            candidates.append(
                {
                    **base,
                    "status": "sum_insured_needs_review",
                    "policy_uin": terms.uin,
                    "next_step": "Confirm the sum insured on the insured person's policy schedule.",
                }
            )
            continue

        resolved = resolve_policy_terms(terms.uin, sum_insured)
        if resolved is None:
            candidates.append(
                {
                    **base,
                    "status": "sum_insured_tier_not_in_catalog",
                    "policy_uin": terms.uin,
                    "sum_insured": sum_insured,
                    "next_step": "The product is known, but this sum-insured tier is not covered by the reviewed catalog.",
                }
            )
            continue

        product_terms, tier = resolved
        candidates.append(
            {
                **base,
                "status": "needs_schedule_confirmation",
                "rule_summary": make_rule_summary(product_terms, tier, sum_insured).model_dump(mode="json"),
                "next_step": "Confirm that the insured person's active policy schedule matches this UIN, plan, sum insured, and version before running a scenario.",
            }
        )

    return candidates


def get_policy_terms_for_case(state: dict) -> dict[str, Any]:
    candidates = _all_policy_candidates(state)
    ready = [item for item in candidates if item.get("status") == "needs_schedule_confirmation"]
    if not candidates:
        status = "policy_document_required"
    elif len(ready) == 1 and len(candidates) == 1:
        status = "needs_schedule_confirmation"
    elif len(candidates) > 1:
        status = "multiple_policy_documents_choose_one"
    else:
        status = "policy_terms_unavailable_or_need_review"
    return {
        "status": status,
        "case_id": state.get("case", {}).get("id"),
        "candidates": candidates,
        "notice": (
            "The catalog contains product-level reference terms. It does not replace the insured person's schedule, "
            "endorsements, policy wording, or insurer confirmation."
        ),
    }


def assess_policy_for_case(state: dict, request: PolicyAssessmentRequest) -> dict[str, Any]:
    documents_by_id = {document.get("id"): document for document in state.get("documents", [])}
    policy_document = documents_by_id.get(request.policy_document_id)
    bill_document = documents_by_id.get(request.bill_document_id)
    if not policy_document or policy_document.get("document_type") != "health_policy":
        raise PolicyAssessmentError("The selected policy document is not part of this case.", 404)
    if not bill_document or bill_document.get("document_type") != "hospital_estimate":
        raise PolicyAssessmentError("The selected bill document is not part of this case.", 404)
    if policy_document.get("processing_status") != "done" or bill_document.get("processing_status") != "done":
        raise PolicyAssessmentError("Both selected documents must finish processing before assessment.", 409)
    if request.schedule_confirmed is not True:
        raise PolicyAssessmentError(
            "Confirm that this is the insured person's active policy schedule and that its UIN, plan, sum insured, and version match before running a scenario.",
            409,
        )
    if request.bill_items_confirmed is not True:
        raise PolicyAssessmentError(
            "Review and confirm that the itemised lines are complete, correctly categorised, and tied to the cited bill pages before calculating.",
            409,
        )

    policy_uin_fact = _confident_value(state.get("facts", []), request.policy_document_id, "policy_uin")
    sum_insured_fact = _confident_value(state.get("facts", []), request.policy_document_id, "sum_insured")
    extracted_uin = str(policy_uin_fact.get("value_json", "")).strip() if policy_uin_fact else ""
    if not extracted_uin or normalise_uin(extracted_uin) != normalise_uin(request.policy_uin):
        raise PolicyAssessmentError(
            "The supplied UIN does not match a high-confidence UIN extracted from this case's selected policy document.",
            409,
        )
    sum_insured = _amount_fact(sum_insured_fact)
    if sum_insured is None:
        raise PolicyAssessmentError(
            "A clear, positive sum insured must be extracted from the same selected policy document.",
            409,
        )

    resolved = resolve_policy_terms(extracted_uin, sum_insured)
    if resolved is None:
        if find_policy_terms(extracted_uin) is None:
            raise PolicyAssessmentError(
                "No reviewed numeric policy rules are available for this UIN. The engine will not infer terms from another insurer or product.",
                422,
            )
        raise PolicyAssessmentError(
            "This product's extracted sum-insured tier is not in the reviewed rule catalog.",
            422,
        )
    terms, tier = resolved

    bill_total_fact = _confident_value(
        state.get("facts", []), request.bill_document_id, "estimated_total_amount"
    )
    bill_total = _amount_fact(bill_total_fact)
    if bill_total is None:
        raise PolicyAssessmentError(
            "A clear bill total must be extracted from the selected hospital estimate before line items can be reconciled.",
            409,
        )

    extracted_pages = bill_document.get("page_count")
    line_total = sum((item.amount for item in request.line_items), Decimal("0"))
    if abs(line_total - Decimal(bill_total)) > Decimal("1"):
        raise PolicyAssessmentError(
            f"Bill line items total ₹{line_total:,.0f}, but the selected document's extracted total is ₹{bill_total:,.0f}. Reconcile the complete itemised bill before calculating.",
            422,
        )
    if extracted_pages:
        bad_pages = sorted({item.source_page for item in request.line_items if item.source_page > extracted_pages})
        if bad_pages:
            raise PolicyAssessmentError(
                f"Bill line-item source page(s) {', '.join(map(str, bad_pages))} are outside this document's {extracted_pages} pages.",
                422,
            )

    result = calculate_policy_scenario(
        terms=terms,
        tier=tier,
        sum_insured=sum_insured,
        line_items=request.line_items,
        proportionate_deduction_applicability=request.proportionate_deduction_applicability,
        bill_document_name=bill_document.get("file_name") or "Uploaded bill",
    )
    result["case_id"] = state.get("case", {}).get("id")
    result["user_confirmations"] = {
        "policy_schedule_match": True,
        "bill_line_items_reviewed_and_confirmed": True,
        "bill_line_items_reconciled_to_document_total": True,
        "proportionate_deduction_applicability": request.proportionate_deduction_applicability,
    }
    result["policy_identity_evidence"] = _fact_evidence(
        policy_uin_fact, policy_document.get("file_name") or "Uploaded policy"
    )
    result["sum_insured_evidence"] = _fact_evidence(
        sum_insured_fact, policy_document.get("file_name") or "Uploaded policy"
    )
    result["bill_total_evidence"] = _fact_evidence(
        bill_total_fact, bill_document.get("file_name") or "Uploaded bill"
    )
    return result
