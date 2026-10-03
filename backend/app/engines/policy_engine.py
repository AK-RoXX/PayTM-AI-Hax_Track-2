"""Deterministic, provenance-carrying policy limit and bill scenario engine.

This module deliberately contains no LLM calls. A product is selected only by
an exact UIN match, and its numeric rules are loaded from the reviewed catalog
at ``app/data/policy_catalog.json``. The output is a scenario range, not claim
adjudication or an insurer payment promise.
"""
from __future__ import annotations

import json
import re
from decimal import Decimal, ROUND_HALF_UP
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

from app.schemas.policy import (
    PolicyBillLineItem,
    PolicyRuleSummary,
    PolicyTerms,
    PolicyTierTerms,
)

CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "policy_catalog.json"
RUPEE = Decimal("1")
POLICY_CATALOG_VERSION = "2026-10-03.2"


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(RUPEE, rounding=ROUND_HALF_UP)


def normalise_uin(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


@lru_cache(maxsize=1)
def load_policy_catalog() -> tuple[PolicyTerms, ...]:
    """Load and validate the checked-in product terms once per process."""
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 2:
        raise ValueError("Unsupported policy catalog schema version.")
    if payload.get("catalog_version") != POLICY_CATALOG_VERSION:
        raise ValueError("Policy catalog version does not match the engine release.")
    products = tuple(PolicyTerms.model_validate(item) for item in payload.get("products", []))
    uins = [normalise_uin(product.uin) for product in products]
    if len(uins) != len(set(uins)):
        raise ValueError("The policy catalog contains duplicate UINs.")
    return products


def find_policy_terms(uin: str) -> PolicyTerms | None:
    """Return terms for an exact UIN, never by insurer-name fuzzy matching."""
    requested = normalise_uin(uin)
    if not requested:
        return None
    return next(
        (product for product in load_policy_catalog() if normalise_uin(product.uin) == requested),
        None,
    )


def select_policy_tier(terms: PolicyTerms, sum_insured: int) -> PolicyTierTerms | None:
    """Resolve one explicitly supported sum-insured tier or abstain."""
    matches = [tier for tier in terms.tiers if tier.supports(sum_insured)]
    return matches[0] if len(matches) == 1 else None


def resolve_policy_terms(
    uin: str,
    sum_insured: int,
) -> tuple[PolicyTerms, PolicyTierTerms] | None:
    terms = find_policy_terms(uin)
    if terms is None:
        return None
    tier = select_policy_tier(terms, sum_insured)
    return (terms, tier) if tier else None


def _daily_limit(rule: Any, sum_insured: int) -> Decimal | None:
    if rule.method == "actuals":
        return None
    amount = Decimal(sum_insured) * rule.percentage / Decimal("100")
    if rule.maximum_per_day is not None:
        amount = min(amount, rule.maximum_per_day)
    return _money(amount)


def _rule_explanation(rule: Any, sum_insured: int, limit_per_day: Decimal | None) -> str:
    if rule.method == "actuals":
        return "Billed at actuals under the product reference, subject to other policy terms."
    calculation = f"{rule.percentage}% of ₹{sum_insured:,} sum insured per day"
    if rule.maximum_per_day is not None:
        calculation += f", capped at ₹{int(rule.maximum_per_day):,} per day"
    if limit_per_day is not None:
        calculation += f"; this tier calculates to ₹{int(limit_per_day):,} per day"
    return calculation + "."


def make_rule_summary(
    terms: PolicyTerms,
    tier: PolicyTierTerms,
    sum_insured: int,
) -> PolicyRuleSummary:
    room_limit = _daily_limit(tier.room_rent, sum_insured)
    icu_limit = _daily_limit(tier.icu, sum_insured)
    return PolicyRuleSummary(
        status="needs_schedule_confirmation",
        insurer=terms.insurer,
        product_name=terms.product_name,
        product_id=terms.product_id,
        uin=terms.uin,
        tier_id=tier.tier_id,
        tier_label=tier.label,
        sum_insured=sum_insured,
        room_rent_limit_per_day=int(room_limit) if room_limit is not None else None,
        icu_limit_per_day=int(icu_limit) if icu_limit is not None else None,
        room_rent_rule_explanation=_rule_explanation(tier.room_rent, sum_insured, room_limit),
        room_rent_source_quote=terms.source.room_rent_wording,
        room_rent_source_pages=terms.source.room_rent_pages,
        icu_rule_explanation=_rule_explanation(tier.icu, sum_insured, icu_limit),
        icu_source_quote=terms.source.icu_wording,
        icu_source_pages=terms.source.icu_pages,
        source_title=terms.source.title,
        source_pages=terms.source.pages,
        source_kind=terms.source.kind,
        scope_note=terms.source.scope_note,
    )


def calculate_policy_scenario(
    *,
    terms: PolicyTerms,
    tier: PolicyTierTerms,
    sum_insured: int,
    line_items: Iterable[PolicyBillLineItem],
    proportionate_deduction_applicability: str,
    bill_document_name: str,
) -> dict[str, Any]:
    """Calculate capped scenario ranges from a complete, itemised bill.

    Room/boarding/nursing and ICU related charges each share one daily limit.
    Proportionate deduction uses the prospectus's eligible room-rate / actual
    room-rate ratio; whether differential billing makes it applicable remains
    a user-confirmed condition. Other policy conditions stay unresolved.
    """
    items = list(line_items)
    if not items:
        raise ValueError("At least one bill line item is required.")
    if proportionate_deduction_applicability not in {"yes", "no", "unknown"}:
        raise ValueError("Invalid proportionate deduction state.")

    totals: dict[str, Decimal] = {}
    for item in items:
        totals[item.category] = totals.get(item.category, Decimal("0")) + item.amount

    bill_total = sum(totals.values(), Decimal("0"))
    room_limit = _daily_limit(tier.room_rent, sum_insured)
    icu_limit = _daily_limit(tier.icu, sum_insured)

    room_categories = {"room_rent", "room_related"}

    def category_admissible(
        categories: set[str],
        group_name: str,
        rule: Any,
        limit_per_day: Decimal | None,
    ) -> tuple[Decimal, dict[str, Any], dict[str, Decimal]]:
        category_items = [item for item in items if item.category in categories]
        billed = sum((item.amount for item in category_items), Decimal("0"))
        day_counts = {item.quantity for item in category_items if item.quantity is not None}
        if len(day_counts) > 1:
            raise ValueError(
                f"All {group_name} charge rows must use the same number of stay days so the shared daily limit can be applied accurately."
            )
        days = next(iter(day_counts), Decimal("0"))
        if limit_per_day is not None and days:
            allowed = min(billed, limit_per_day * days)
            allowed_share = allowed / billed if billed else Decimal("1")
            allowed_lines = {
                item.line_id: item.amount * allowed_share for item in category_items
            }
        else:
            allowed = billed
            allowed_lines = {item.line_id: item.amount for item in category_items}
        if not billed:
            return Decimal("0"), {
                "group": group_name,
                "billed": 0,
                "days": 0,
                "billed_per_day": 0,
                "limit_per_day": int(limit_per_day) if limit_per_day is not None else None,
                "modelled_before_proportionate_deduction": 0,
                "rule": rule.method,
                "bill_document": bill_document_name,
                "bill_pages": [],
                "policy_rule_source": {
                    "document_title": terms.source.title,
                    "kind": terms.source.kind,
                    "uin": terms.uin,
                    "pages": terms.source.pages,
                },
            }, {}
        per_day = billed / days if days else Decimal("0")
        return allowed, {
            "group": group_name,
            "billed": int(_money(billed)),
            "days": float(days),
            "billed_per_day": int(_money(per_day)) if days else None,
            "limit_per_day": int(limit_per_day) if limit_per_day is not None else None,
            "modelled_before_proportionate_deduction": int(_money(allowed)),
            "rule": rule.method,
            "bill_document": bill_document_name,
            "bill_pages": sorted({item.source_page for item in category_items}),
            "policy_rule_source": {
                "document_title": terms.source.title,
                "kind": terms.source.kind,
                "uin": terms.uin,
                "pages": terms.source.pages,
            },
            "line_calculations": [
                {
                    "line_id": item.line_id,
                    "description": item.description,
                    "category": item.category,
                    "billed_amount": int(_money(item.amount)),
                    "days": float(item.quantity) if item.quantity is not None else None,
                    "modelled_amount_before_proportionate_deduction": int(_money(allowed_lines[item.line_id])),
                    "bill_page": item.source_page,
                }
                for item in category_items
            ],
        }, allowed_lines

    room_allowed, room_detail, room_allowed_by_line = category_admissible(
        room_categories, "room, boarding, and nursing", tier.room_rent, room_limit
    )
    icu_allowed, icu_detail, icu_allowed_by_line = category_admissible(
        {"icu"}, "ICU and associated daily-limit", tier.icu, icu_limit
    )
    actual_room_rent = totals.get("room_rent", Decimal("0"))
    room_rent_days = max(
        (item.quantity or Decimal("0") for item in items if item.category == "room_rent"),
        default=Decimal("0"),
    )
    actual_room_rate_per_day = (
        actual_room_rent / room_rent_days if actual_room_rent and room_rent_days else None
    )
    if actual_room_rate_per_day is not None and room_limit is not None:
        room_ratio = min(Decimal("1"), room_limit / actual_room_rate_per_day)
    else:
        room_ratio = Decimal("1")

    proportionate = terms.proportionate_deduction
    associated_categories = set(proportionate.applies_to)
    exempt_categories = set(proportionate.exempt_categories)
    adjusted_line_items: list[dict[str, Any]] = []
    base_total = Decimal("0")
    proportionately_adjusted_total = Decimal("0")
    for category, amount in totals.items():
        if category in room_categories:
            base = sum(
                (room_allowed_by_line[item.line_id] for item in items if item.category == category),
                Decimal("0"),
            )
        elif category == "icu":
            base = sum(
                (icu_allowed_by_line[item.line_id] for item in items if item.category == category),
                Decimal("0"),
            )
        else:
            base = amount

        proportional = category in associated_categories and category not in exempt_categories
        adjusted = base * room_ratio if proportional and room_ratio < 1 else base
        base_total += base
        proportionately_adjusted_total += adjusted
        source_pages = sorted({item.source_page for item in items if item.category == category})
        adjusted_line_items.append(
            {
                "category": category,
                "billed_amount": int(_money(amount)),
                "modelled_amount_before_proportionate_deduction": int(_money(base)),
                "modelled_amount_if_proportionate_deduction_applies": int(_money(adjusted)),
                "proportionate_deduction_applied_to_category": bool(proportional and room_ratio < 1),
                "bill_document": bill_document_name,
                "policy_rule_source": {
                    "document_title": terms.source.title,
                    "kind": terms.source.kind,
                    "uin": terms.uin,
                    "pages": terms.source.pages,
                },
                "source_pages": source_pages,
            }
        )

    itemized_lines: list[dict[str, Any]] = []
    for item in items:
        if item.category in room_categories:
            rule = tier.room_rent
            daily_limit = room_limit
            modelled_before_proportionate = room_allowed_by_line[item.line_id]
            amount_over_limit = item.amount - modelled_before_proportionate
        elif item.category == "icu":
            rule = tier.icu
            daily_limit = icu_limit
            modelled_before_proportionate = icu_allowed_by_line[item.line_id]
            amount_over_limit = item.amount - modelled_before_proportionate
        else:
            rule = None
            daily_limit = None
            amount_over_limit = Decimal("0")
            modelled_before_proportionate = item.amount

        proportional = (
            item.category in associated_categories
            and item.category not in exempt_categories
        )
        if item.category in room_categories or item.category == "icu":
            proportionate_amount = modelled_before_proportionate
        elif proportional:
            proportionate_amount = item.amount * room_ratio
        else:
            proportionate_amount = modelled_before_proportionate

        if item.category in room_categories or item.category == "icu":
            lower_line = upper_line = modelled_before_proportionate
        elif proportional and proportionate_deduction_applicability == "yes":
            lower_line = upper_line = proportionate_amount
        elif proportional and proportionate_deduction_applicability == "no":
            lower_line = upper_line = item.amount
        elif proportional:
            lower_line, upper_line = proportionate_amount, item.amount
        else:
            lower_line = upper_line = item.amount

        rule_source = {
            "document_title": terms.source.title,
            "document_kind": terms.source.kind,
            "uin": terms.uin,
            "pages": (
                terms.source.room_rent_pages
                if item.category in room_categories
                else terms.source.icu_pages
                if item.category == "icu"
                else terms.source.proportionate_deduction_pages
                if proportional or item.category in exempt_categories
                else terms.source.pages
            ),
            "quote": (
                terms.source.room_rent_wording
                if item.category in room_categories
                else terms.source.icu_wording
                if item.category == "icu"
                else terms.source.proportionate_deduction_wording
                if proportional or item.category in exempt_categories
                else ""
            ),
        }
        itemized_lines.append(
            {
                "line_id": item.line_id,
                "description": item.description,
                "category": item.category,
                "billed_amount": int(_money(item.amount)),
                "quantity_days": float(item.quantity) if item.quantity is not None else None,
                "daily_limit": int(daily_limit) if daily_limit is not None else None,
                "rule_explanation": (
                    _rule_explanation(rule, sum_insured, daily_limit)
                    if rule is not None
                    else (
                        "This category is exempt from the catalogued room proportionate-deduction rule."
                        if item.category in exempt_categories
                        else "No separate sublimit for this category is modelled here."
                    )
                ),
                "modelled_amount_before_other_terms": int(_money(modelled_before_proportionate)),
                "amount_above_known_daily_limit": int(_money(amount_over_limit)),
                "modelled_amount_if_proportionate_deduction_applies": int(_money(proportionate_amount)),
                "modelled_amount_range": {
                    "minimum": int(_money(lower_line)),
                    "maximum": int(_money(upper_line)),
                },
                "proportionate_deduction_applicable_to_line": proportional,
                "bill_evidence": {
                    "document_name": bill_document_name,
                    "page_number": item.source_page,
                    "quote": item.source_quote,
                },
                "policy_rule_evidence": rule_source,
            }
        )

    if proportionate_deduction_applicability == "yes":
        lower_before_sum_limit = upper_before_sum_limit = proportionately_adjusted_total
        prop_state = "applied_using_disclosed_ratio_assumption"
    elif proportionate_deduction_applicability == "no":
        lower_before_sum_limit = upper_before_sum_limit = base_total
        prop_state = "not_applied_user_or_hospital_condition_marked_no"
    else:
        lower_before_sum_limit = proportionately_adjusted_total
        upper_before_sum_limit = base_total
        prop_state = "unknown_range_shown"

    coverage_lower = min(lower_before_sum_limit, Decimal(sum_insured))
    coverage_upper = min(upper_before_sum_limit, Decimal(sum_insured))
    total_bill_rupees = _money(bill_total)
    gap_minimum = max(Decimal("0"), total_bill_rupees - _money(coverage_upper))
    gap_maximum = max(Decimal("0"), total_bill_rupees - _money(coverage_lower))

    evidence = {
        "document_title": terms.source.title,
        "document_kind": terms.source.kind,
        "uin": terms.uin,
        "pages": terms.source.pages,
        "document_path": terms.source.document_path,
    }
    return {
        "status": "scenario_estimate",
        "policy": {
            "insurer": terms.insurer,
            "product_name": terms.product_name,
            "product_id": terms.product_id,
            "uin": terms.uin,
            "tier_id": tier.tier_id,
            "tier_label": tier.label,
            "sum_insured": sum_insured,
            "source": evidence,
            "source_scope": "prospectus_reference_requires_schedule_confirmation",
        },
        "financial_map": {
            "hospital_bill_total": int(total_bill_rupees),
            "modelled_coverage_range_before_unmodelled_terms": {
                "minimum": int(_money(coverage_lower)),
                "maximum": int(_money(coverage_upper)),
            },
            "modelled_gap_range_before_unmodelled_terms": {
                "minimum": int(_money(gap_minimum)),
                "maximum": int(_money(gap_maximum)),
            },
            "sum_insured_ceiling": sum_insured,
        },
        "room_rent": room_detail,
        "icu": icu_detail,
        "line_items": adjusted_line_items,
        "itemized_lines": itemized_lines,
        "proportionate_deduction": {
            "applicability": prop_state,
            "room_cost_ratio_assumption": float(room_ratio.quantize(Decimal("0.0001"))),
            "eligible_room_rate_per_day": int(room_limit) if room_limit is not None else None,
            "actual_room_rate_per_day": (
                int(_money(actual_room_rate_per_day))
                if actual_room_rate_per_day is not None
                else None
            ),
            "applies_to": sorted(associated_categories),
            "exempt_categories": sorted(exempt_categories),
            "formula_note": proportionate.source_wording_note,
        },
        "assumptions": [
            "All line items are complete, accurate, and otherwise eligible before applying the listed room/ICU limits.",
            "Room, boarding, and nursing charges share the room daily limit; ICU and associated daily-limit charges share the ICU limit.",
            "When several charges share a daily limit, the allowed group amount is allocated across those rows in proportion to billed amounts for display.",
            "The same UIN and sum-insured tier apply to the insured person's active policy schedule and endorsements.",
            "An unknown proportionate-deduction condition is represented as a range.",
            "The output is before co-payment, deductible, waiting-period, exclusion, prior-claim, and other unmodelled adjustments.",
        ],
        "unmodelled_terms": terms.not_modelled,
        "disclaimer": (
            "A deterministic planning scenario from a published prospectus and user-confirmed bill items. "
            "It is not a coverage confirmation, claim approval, insurer settlement, legal opinion, or lending decision."
        ),
    }
