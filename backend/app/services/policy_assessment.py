"""Case-scoped policy matching and input validation for the policy engine."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from app.engines.policy_engine import (
    POLICY_CATALOG_VERSION,
    calculate_policy_scenario,
    find_policy_terms,
    make_rule_summary,
    normalise_uin,
    resolve_policy_terms,
)
from app.schemas.policy import (
    BillLineItemReviewInput,
    BillLineItemsReviewRequest,
    PolicyAssessmentRequest,
    PolicyBillLineItem,
)
from app.services.document_pipeline import DocumentPipelineError, _supabase_request

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


def _selected_documents(state: dict, policy_document_id: str, bill_document_id: str) -> tuple[dict, dict]:
    documents_by_id = {document.get("id"): document for document in state.get("documents", [])}
    policy_document = documents_by_id.get(policy_document_id)
    bill_document = documents_by_id.get(bill_document_id)
    if not policy_document or policy_document.get("document_type") != "health_policy":
        raise PolicyAssessmentError("The selected policy document is not part of this case.", 404)
    if not bill_document or bill_document.get("document_type") != "hospital_estimate":
        raise PolicyAssessmentError("The selected bill document is not part of this case.", 404)
    if policy_document.get("processing_status") != "done" or bill_document.get("processing_status") != "done":
        raise PolicyAssessmentError("Both selected documents must finish processing before assessment.", 409)
    return policy_document, bill_document


def _bill_total_for_document(state: dict, document_id: str) -> tuple[int | None, dict | None]:
    fact = _confident_value(state.get("facts", []), document_id, "estimated_total_amount")
    return _amount_fact(fact), fact


def _line_payload(item: BillLineItemReviewInput) -> dict[str, Any]:
    return {
        **item.model_dump(exclude={"amount", "quantity", "confidence"}),
        "amount": float(item.amount),
        "quantity": float(item.quantity) if item.quantity is not None else None,
        "confidence": float(item.confidence),
    }


def get_bill_line_items(state: dict, document_id: str) -> dict[str, Any]:
    document = next((item for item in state.get("documents", []) if item.get("id") == document_id), None)
    if not document or document.get("document_type") != "hospital_estimate":
        raise PolicyAssessmentError("The selected hospital bill is not part of this case.", 404)
    bill_total, _ = _bill_total_for_document(state, document_id)
    raw_items = document.get("bill_line_items") or []
    try:
        items = [BillLineItemReviewInput.model_validate(item) for item in raw_items]
    except Exception as error:
        raise PolicyAssessmentError("Saved bill rows are invalid. Edit or replace the itemisation before continuing.", 409) from error
    return {
        "status": "confirmed" if document.get("bill_items_confirmed") else "needs_review",
        "bill_document_id": document_id,
        "bill_document_name": document.get("file_name") or "Uploaded bill",
        "bill_total": bill_total,
        "items_total": sum((item.amount for item in items), Decimal("0")),
        "confirmed_complete": bool(document.get("bill_items_confirmed")),
        "items": [_line_payload(item) for item in items],
        "review_message": (
            "Bill itemisation is confirmed and reconciled to the extracted total."
            if document.get("bill_items_confirmed")
            else "Review every proposed row, correct its category and amount, then confirm that the list is complete."
        ),
    }


def save_bill_line_items(
    state: dict,
    document_id: str,
    request: BillLineItemsReviewRequest,
    user_id: str,
) -> dict[str, Any]:
    document = _selected_documents_for_bill(state, document_id)
    bill_total, _ = _bill_total_for_document(state, document_id)
    if request.confirmed_complete:
        if bill_total is None:
            raise PolicyAssessmentError(
                "A high-confidence bill total is required before the itemisation can be confirmed.", 409
            )
        if any(item.category == "unclassified" for item in request.items):
            raise PolicyAssessmentError("Categorise every bill line before confirming the complete itemisation.")
        for item in request.items:
            if item.category in {"room_rent", "room_related", "icu"} and item.quantity is None:
                raise PolicyAssessmentError("Add the number of days to each room, boarding/nursing, and ICU line before confirming.")
        total = sum((item.amount for item in request.items), Decimal("0"))
        if abs(total - Decimal(bill_total)) > Decimal("1"):
            raise PolicyAssessmentError(
                f"Bill rows total ₹{total:,.0f}, while the extracted bill total is ₹{bill_total:,.0f}. Reconcile the rows before confirming."
            )

    page_count = document.get("page_count")
    if page_count:
        invalid_pages = sorted({item.source_page for item in request.items if item.source_page > page_count})
        if invalid_pages:
            raise PolicyAssessmentError(
                f"Bill row source page(s) {', '.join(map(str, invalid_pages))} exceed this document's {page_count} pages."
            )

    payload = {
        "bill_line_items": [_line_payload(item) for item in request.items],
        "bill_items_confirmed": request.confirmed_complete,
        "bill_items_confirmed_at": (
            datetime.now(timezone.utc).isoformat() if request.confirmed_complete else None
        ),
        "bill_items_confirmed_by": user_id if request.confirmed_complete else None,
    }
    try:
        _supabase_request(
            "PATCH",
            f"/rest/v1/documents?id=eq.{document_id}&case_id=eq.{state['case']['id']}",
            headers={"Prefer": "return=minimal"},
            json=payload,
        )
        # Any edit changes the calculation inputs. Mark prior snapshots stale.
        _supabase_request(
            "PATCH",
            "/rest/v1/policy_assessments",
            params={
                "case_id": f"eq.{state['case']['id']}",
                "bill_document_id": f"eq.{document_id}",
                "status": "eq.current",
            },
            headers={"Prefer": "return=minimal"},
            json={"status": "stale"},
        )
    except DocumentPipelineError as error:
        raise PolicyAssessmentError("Could not save the bill review. Please try again.", 503) from error
    refreshed = dict(document)
    refreshed.update(payload)
    refreshed["bill_line_items"] = payload["bill_line_items"]
    refreshed["bill_items_confirmed"] = request.confirmed_complete
    return get_bill_line_items(
        {**state, "documents": [refreshed if item.get("id") == document_id else item for item in state["documents"]]},
        document_id,
    )


def _selected_documents_for_bill(state: dict, document_id: str) -> dict:
    document = next((item for item in state.get("documents", []) if item.get("id") == document_id), None)
    if not document or document.get("document_type") != "hospital_estimate":
        raise PolicyAssessmentError("The selected hospital bill is not part of this case.", 404)
    if document.get("processing_status") != "done":
        raise PolicyAssessmentError("The hospital bill must finish processing before rows can be reviewed.", 409)
    return document


def _invalidate_current_assessments(case_id: str) -> None:
    try:
        _supabase_request(
            "PATCH",
            "/rest/v1/policy_assessments",
            params={"case_id": f"eq.{case_id}", "status": "eq.current"},
            headers={"Prefer": "return=minimal"},
            json={"status": "stale"},
        )
    except DocumentPipelineError as error:
        raise PolicyAssessmentError("Could not invalidate an earlier scenario.", 503) from error


def assess_policy_for_case(state: dict, request: PolicyAssessmentRequest, user_id: str) -> dict[str, Any]:
    policy_document, bill_document = _selected_documents(
        state, request.policy_document_id, request.bill_document_id
    )
    if request.schedule_confirmed is not True:
        raise PolicyAssessmentError(
            "Confirm that this is the insured person's active policy schedule and that its UIN, plan, sum insured, and version match before running a scenario.",
            409,
        )
    if not bill_document.get("bill_items_confirmed"):
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

    bill_total, bill_total_fact = _bill_total_for_document(state, request.bill_document_id)
    if bill_total is None:
        raise PolicyAssessmentError(
            "A clear bill total must be extracted from the selected hospital estimate before line items can be reconciled.",
            409,
        )

    try:
        line_items = [
            PolicyBillLineItem.model_validate(item)
            for item in (bill_document.get("bill_line_items") or [])
        ]
    except Exception as error:
        raise PolicyAssessmentError("The reviewed bill rows cannot be used for calculation. Please review them again.", 409) from error
    if not line_items:
        raise PolicyAssessmentError("Add bill lines and confirm the complete itemisation before calculating.", 409)

    extracted_pages = bill_document.get("page_count")
    line_total = sum((item.amount for item in line_items), Decimal("0"))
    if abs(line_total - Decimal(bill_total)) > Decimal("1"):
        raise PolicyAssessmentError(
            f"Bill line items total ₹{line_total:,.0f}, but the selected document's extracted total is ₹{bill_total:,.0f}. Reconcile the complete itemised bill before calculating.",
            422,
        )
    proportional_categories = set(terms.proportionate_deduction.applies_to)
    has_associated_expenses = any(item.category in proportional_categories for item in line_items)
    has_room_rate = any(item.category == "room_rent" for item in line_items)
    if (
        has_associated_expenses
        and not has_room_rate
        and request.proportionate_deduction_applicability != "no"
    ):
        raise PolicyAssessmentError(
            "The policy's proportionate-deduction ratio needs the actual room-rent line and stay days. Add that row, or mark the condition not applicable only if the hospital has confirmed non-differential billing.",
            422,
        )
    for categories, label in (
        ({"room_rent", "room_related"}, "room / boarding / nursing"),
        ({"icu"}, "ICU"),
    ):
        day_counts = {
            item.quantity for item in line_items
            if item.category in categories and item.quantity is not None
        }
        if len(day_counts) > 1:
            raise PolicyAssessmentError(
                f"All {label} rows sharing a daily limit must use the same stay-day count. This calculator models one common stay period, so reconcile lines that cover different periods before calculating.",
                422,
            )
    if extracted_pages:
        bad_pages = sorted({item.source_page for item in line_items if item.source_page > extracted_pages})
        if bad_pages:
            raise PolicyAssessmentError(
                f"Bill line-item source page(s) {', '.join(map(str, bad_pages))} are outside this document's {extracted_pages} pages.",
                422,
            )

    result = calculate_policy_scenario(
        terms=terms,
        tier=tier,
        sum_insured=sum_insured,
        line_items=line_items,
        proportionate_deduction_applicability=request.proportionate_deduction_applicability,
        bill_document_name=bill_document.get("file_name") or "Uploaded bill",
    )
    result["case_id"] = state.get("case", {}).get("id")
    result["catalog_version"] = POLICY_CATALOG_VERSION
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
    source_snapshot = {
        "policy_document_id": policy_document["id"],
        "policy_uploaded_at": policy_document.get("uploaded_at"),
        "policy_uin": terms.uin,
        "sum_insured": str(sum_insured),
        "bill_document_id": bill_document["id"],
        "bill_uploaded_at": bill_document.get("uploaded_at"),
        "bill_total": str(bill_total),
        "bill_items_confirmed_at": bill_document.get("bill_items_confirmed_at"),
        "catalog_version": POLICY_CATALOG_VERSION,
    }
    input_payload = request.model_dump(mode="json")
    input_payload["bill_items_confirmed"] = True
    input_payload["reviewed_line_items"] = [item.model_dump(mode="json") for item in line_items]
    try:
        _invalidate_current_assessments(str(result["case_id"]))
        saved = _supabase_request(
            "POST",
            "/rest/v1/policy_assessments",
            headers={"Prefer": "return=representation"},
            json={
                "case_id": result["case_id"],
                "policy_document_id": policy_document["id"],
                "bill_document_id": bill_document["id"],
                "policy_uin": terms.uin,
                "product_id": terms.product_id,
                "catalog_version": POLICY_CATALOG_VERSION,
                "status": "current",
                "input_json": input_payload,
                "source_snapshot_json": source_snapshot,
                "result_json": result,
                "created_by": user_id,
            },
        ).json()
    except DocumentPipelineError as error:
        raise PolicyAssessmentError("The scenario was calculated but could not be saved.", 503) from error
    result["assessment_id"] = saved[0]["id"] if saved else None
    result["source_snapshot"] = source_snapshot
    return result


def get_policy_assessment(state: dict) -> dict[str, Any]:
    case_id = state.get("case", {}).get("id")
    if not case_id:
        return {"status": "not_calculated", "assessment": None}
    try:
        rows = _supabase_request(
            "GET",
            "/rest/v1/policy_assessments",
            params={
                "case_id": f"eq.{case_id}",
                "select": "id,policy_document_id,bill_document_id,catalog_version,status,input_json,source_snapshot_json,result_json,created_at",
                "order": "created_at.desc",
                "limit": "1",
            },
        ).json()
    except DocumentPipelineError as error:
        raise PolicyAssessmentError("Could not load the saved policy scenario.", 503) from error
    if not rows:
        return {"status": "not_calculated", "assessment": None}

    row = rows[0]
    docs = {item.get("id"): item for item in state.get("documents", [])}
    snapshot = row.get("source_snapshot_json") or {}
    policy = docs.get(row.get("policy_document_id"))
    bill = docs.get(row.get("bill_document_id"))
    policy_uin_fact = _confident_value(
        state.get("facts", []), row.get("policy_document_id"), "policy_uin"
    ) if policy else None
    sum_insured_fact = _confident_value(
        state.get("facts", []), row.get("policy_document_id"), "sum_insured"
    ) if policy else None
    bill_total, _ = _bill_total_for_document(state, row.get("bill_document_id")) if bill else (None, None)
    still_current = (
        row.get("status") == "current"
        and row.get("catalog_version") == POLICY_CATALOG_VERSION
        and policy is not None
        and bill is not None
        and policy.get("processing_status") == "done"
        and bill.get("processing_status") == "done"
        and bill.get("bill_items_confirmed") is True
        and snapshot.get("policy_uploaded_at") == policy.get("uploaded_at")
        and policy_uin_fact is not None
        and normalise_uin(str(policy_uin_fact.get("value_json", ""))) == normalise_uin(str(snapshot.get("policy_uin", "")))
        and _amount_fact(sum_insured_fact) is not None
        and str(_amount_fact(sum_insured_fact)) == snapshot.get("sum_insured")
        and snapshot.get("bill_uploaded_at") == bill.get("uploaded_at")
        and bill_total is not None
        and str(bill_total) == snapshot.get("bill_total")
        and snapshot.get("bill_items_confirmed_at") == bill.get("bill_items_confirmed_at")
    )
    status = "current" if still_current else "stale"
    if row.get("status") == "current" and not still_current:
        try:
            _supabase_request(
                "PATCH",
                "/rest/v1/policy_assessments",
                params={"id": f"eq.{row['id']}"},
                headers={"Prefer": "return=minimal"},
                json={"status": "stale"},
            )
        except DocumentPipelineError:
            pass
    return {
        "status": status,
        "assessment": {
            "id": row["id"],
            "created_at": row.get("created_at"),
            "result": row.get("result_json"),
            "source_snapshot": snapshot,
        },
    }
