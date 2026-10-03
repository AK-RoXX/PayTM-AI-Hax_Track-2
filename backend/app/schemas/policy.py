from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PolicyBillCategory = Literal[
    "room_rent",
    "icu",
    "other_medical",
    "pharmacy",
    "consumables",
    "diagnostics",
    "implants_devices",
]


class DailyLimitRule(BaseModel):
    method: Literal["percent_of_sum_insured", "actuals"]
    percentage: Decimal | None = Field(default=None, ge=0, le=100)
    maximum_per_day: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_formula(self):
        if self.method == "percent_of_sum_insured":
            if self.percentage is None:
                raise ValueError("A percentage limit needs a percentage.")
        elif self.percentage is not None or self.maximum_per_day is not None:
            raise ValueError("An actuals limit cannot also have a numeric cap.")
        return self


class PolicyTierTerms(BaseModel):
    tier_id: str
    label: str
    minimum_sum_insured: int | None = Field(default=None, ge=1)
    maximum_sum_insured: int | None = Field(default=None, ge=1)
    supported_sum_insured_values: list[int] = Field(default_factory=list)
    room_rent: DailyLimitRule
    icu: DailyLimitRule

    @model_validator(mode="after")
    def validate_tier_bounds(self):
        if self.minimum_sum_insured is not None and self.maximum_sum_insured is not None:
            if self.minimum_sum_insured > self.maximum_sum_insured:
                raise ValueError("Minimum sum insured cannot exceed maximum sum insured.")
        return self

    def supports(self, sum_insured: int) -> bool:
        if self.supported_sum_insured_values:
            return sum_insured in self.supported_sum_insured_values
        return (
            self.minimum_sum_insured is not None
            and self.maximum_sum_insured is not None
            and self.minimum_sum_insured <= sum_insured <= self.maximum_sum_insured
        )


class PolicySource(BaseModel):
    title: str
    kind: Literal["prospectus", "policy_wording", "policy_schedule"]
    pages: list[int] = Field(min_length=1)
    document_path: str
    scope_note: str


class ProportionateDeductionTerms(BaseModel):
    formula: Literal["eligible_room_cost_divided_by_billed_room_cost"]
    applies_to: list[PolicyBillCategory]
    exempt_categories: list[PolicyBillCategory]
    requires_confirmed_applicability: bool
    source_wording_note: str


class PolicyTerms(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str
    insurer: str
    product_name: str
    uin: str
    source: PolicySource
    tiers: list[PolicyTierTerms] = Field(min_length=1)
    proportionate_deduction: ProportionateDeductionTerms
    not_modelled: list[str] = Field(default_factory=list)


class PolicyBillLineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=180)
    category: PolicyBillCategory
    amount: Decimal = Field(gt=0, le=100000000)
    quantity: Decimal | None = Field(default=None, gt=0, le=365)
    source_page: int = Field(ge=1)

    @model_validator(mode="after")
    def require_days_for_daily_limits(self):
        if self.category in {"room_rent", "icu"} and self.quantity is None:
            raise ValueError("Room and ICU line items need the number of days.")
        if self.category not in {"room_rent", "icu"} and self.quantity is not None:
            raise ValueError("Quantity is only supported for room and ICU day counts.")
        return self


class PolicyAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policy_document_id: str = Field(min_length=1)
    bill_document_id: str = Field(min_length=1)
    policy_uin: str = Field(min_length=5, max_length=40)
    schedule_confirmed: bool
    bill_items_confirmed: bool
    proportionate_deduction_applicability: Literal["yes", "no", "unknown"] = "unknown"
    line_items: list[PolicyBillLineItem] = Field(min_length=1, max_length=100)


class PolicyRuleSummary(BaseModel):
    status: Literal["needs_schedule_confirmation"]
    insurer: str
    product_name: str
    product_id: str
    uin: str
    tier_id: str
    tier_label: str
    sum_insured: int
    room_rent_limit_per_day: int | None = None
    icu_limit_per_day: int | None = None
    source_title: str
    source_pages: list[int]
    source_kind: str
    scope_note: str
