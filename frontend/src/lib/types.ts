export type EventStatus = "complete" | "current" | "pending" | "attention";

export type TimelineEvent = {
  id: string;
  title: string;
  detail: string;
  occurred_at: string | null;
  status: EventStatus;
};

export type MissingRequirement = {
  name: string;
  reason: string;
  priority: "low" | "medium" | "high";
};

export type VerificationStatus =
  | "extracted"
  | "verified"
  | "needs_review"
  | "conflict";

export type ExtractedFact = {
  id: string | null;
  fact_key: string;
  label: string;
  value_json: unknown;
  value_type: string;
  verification_status: VerificationStatus;
  confidence: number;
  source_page: number | null;
  source_quote: string;
  document_id: string | null;
  document_name: string;
  conflicting?: boolean;
};

export type ExtractionStatus =
  | "pending"
  | "done"
  | "no_facts_found"
  | "failed";

export type CaseDocument = {
  id: string;
  case_id: string | null;
  document_type: string;
  file_name: string;
  processing_status: "uploaded" | "processing" | "done" | "failed";
  processing_provider: string | null;
  page_count: number | null;
  error_message: string | null;
  uploaded_at: string | null;
  extraction_status: ExtractionStatus;
  facts_count: number;
  facts: ExtractedFact[];
};

export type Evidence = {
  claim: string;
  document_name: string;
  page_number: number | null;
  section?: string;
  quote: string;
  confidence: number;
};

export type FinancialMap = {
  hospital_estimate: number;
  possible_coverage: number;
  estimated_gap: number;
  status: string;
  calculation_status: "sum_insured_ceiling_only" | "sum_insured_missing" | "bill_amount_missing";
  possible_coverage_basis: string;
  estimated_gap_basis: string;
  disclaimer: string;
};

export type PolicyBillCategory =
  | "room_rent"
  | "room_related"
  | "icu"
  | "other_medical"
  | "pharmacy"
  | "consumables"
  | "diagnostics"
  | "implants_devices";

export type BillLineCategory = PolicyBillCategory | "unclassified";

export type BillLineItem = {
  line_id: string;
  description: string;
  category: BillLineCategory;
  amount: number;
  quantity: number | null;
  source_page: number;
  source_quote: string;
  confidence: number;
  extraction_status: "proposed" | "manual";
};

export type PolicyRuleSummary = {
  status: "needs_schedule_confirmation";
  insurer: string;
  product_name: string;
  product_id: string;
  uin: string;
  tier_id: string;
  tier_label: string;
  sum_insured: number;
  room_rent_limit_per_day: number | null;
  icu_limit_per_day: number | null;
  room_rent_rule_explanation: string;
  room_rent_source_quote: string;
  room_rent_source_pages: number[];
  icu_rule_explanation: string;
  icu_source_quote: string;
  icu_source_pages: number[];
  source_title: string;
  source_pages: number[];
  source_kind: string;
  scope_note: string;
};

export type PolicyCandidate = {
  status: string;
  policy_document_id?: string;
  document_name?: string;
  policy_uin?: string;
  rule_summary?: PolicyRuleSummary;
  next_step?: string;
};

export type PolicyTermsResponse = {
  status: string;
  case_id: string;
  candidates: PolicyCandidate[];
  notice: string;
};

export type BillLineItemsResponse = {
  status: "needs_review" | "confirmed";
  bill_document_id: string;
  bill_document_name: string;
  bill_total: number | null;
  items_total: number;
  confirmed_complete: boolean;
  items: BillLineItem[];
  review_message: string;
};

export type PolicyScenario = {
  status: "scenario_estimate";
  case_id: string;
  catalog_version: string;
  assessment_id?: string | null;
  created_at?: string | null;
  policy: {
    insurer: string;
    product_name: string;
    product_id: string;
    uin: string;
    tier_id: string;
    tier_label: string;
    sum_insured: number;
    source: { document_title: string; document_kind: string; uin: string; pages: number[]; document_path: string };
    source_scope: string;
  };
  financial_map: {
    hospital_bill_total: number;
    modelled_coverage_range_before_unmodelled_terms: { minimum: number; maximum: number };
    modelled_gap_range_before_unmodelled_terms: { minimum: number; maximum: number };
    sum_insured_ceiling: number;
  };
  itemized_lines: Array<{
    line_id: string;
    description: string;
    category: PolicyBillCategory;
    billed_amount: number;
    quantity_days: number | null;
    daily_limit: number | null;
    rule_explanation: string;
    modelled_amount_before_other_terms: number;
    amount_above_known_daily_limit: number;
    modelled_amount_if_proportionate_deduction_applies: number;
    modelled_amount_range: { minimum: number; maximum: number };
    proportionate_deduction_applicable_to_line: boolean;
    bill_evidence: { document_name: string; page_number: number; quote: string };
    policy_rule_evidence: { document_title: string; document_kind: string; uin: string; pages: number[]; quote: string };
  }>;
  line_items: Array<Record<string, unknown>>;
  proportionate_deduction: {
    applicability: string;
    room_cost_ratio_assumption: number;
    eligible_room_rate_per_day: number | null;
    actual_room_rate_per_day: number | null;
    applies_to: string[];
    exempt_categories: string[];
    formula_note: string;
  };
  assumptions: string[];
  unmodelled_terms: string[];
  disclaimer: string;
};

export type PolicyAssessmentResponse = {
  status: "current" | "stale" | "not_calculated";
  assessment: {
    id: string;
    created_at: string | null;
    source_snapshot: Record<string, string | null>;
    result: PolicyScenario;
  } | null;
};

export type CaseData = {
  id: string;
  case_code: string | null;
  case_type: string;
  status: string;
  urgency: string;
  patient_relation: string;
  hospital_name: string;
  readiness_score: number;
  next_best_action: string;
  financial_map: FinancialMap;
  missing_requirements: MissingRequirement[];
  verified_items: string[];
  timeline: TimelineEvent[];
  documents: CaseDocument[];
  facts: ExtractedFact[];
  updated_at: string | null;
};

export type Readiness = {
  score: number;
  missing_requirements: MissingRequirement[];
  verified_items: string[];
  next_best_action: string;
  documents_processing: number;
  documents_failed: number;
};

export type CaseUpdateRequest = {
  estimated_bill?: number | null;
  hospital_name?: string | null;
  patient_relation?: string | null;
  status?: string | null;
};

export type PolicyTermCitation = {
  term_key: string;
  label: string;
  value_rendered: string;
  numeric_value?: number | null;
  document_name: string;
  page_number?: number | null;
  clause_quote: string;
  confidence: number;
};

export type FinancialSummaryBreakdown = {
  gross_bill: number;
  admissible_charges: number;
  room_icu_charges: number;
  pharmacy_diagnostics: number;
  non_medical_deductions: number;
  proportionate_deductions: number;
  total_deductions: number;
  copay_percentage: number;
  copay_amount: number;
  estimated_net_payout: number;
  estimated_out_of_pocket: number;
  calculation_basis: string;
};

export type ClaimVerificationItem = {
  key: string;
  label: string;
  status: "verified" | "missing" | "needs_review" | "conflict";
  reason: string;
  document_name?: string | null;
};

export type ClaimVerificationStatus = {
  readiness_score: number;
  completion_state: "complete" | "incomplete" | "blocked";
  verified_count: number;
  total_requirements: number;
  items: ClaimVerificationItem[];
  has_conflicts: boolean;
};

export type DecisionProofCitation = {
  title: string;
  document_name: string;
  page_number?: number | null;
  quote: string;
  confidence: number;
  category: "policy" | "bill" | "medical" | "identity";
};

export type DecisionOutcome = {
  branch: "proceed" | "abstain" | "escalate";
  status_label: string;
  badge_variant: "green" | "amber" | "red" | "blue";
  headline: string;
  detailed_rationale: string;
  proofs: DecisionProofCitation[];
  abstain_or_rejection_reasons: string[];
  estimated_approval_amount?: number | null;
};

export type HumanEscalationDossier = {
  is_recommended: boolean;
  reason: string;
  dossier_summary: string;
  discrepancies: string[];
  source_facts: Record<string, unknown>[];
  cognee_context_snippets: string[];
};

export type UserNextStep = {
  step_id: string;
  priority: "critical" | "high" | "medium" | "optional";
  title: string;
  description: string;
  action_type:
    | "upload_document"
    | "review_bill_lines"
    | "confirm_policy_terms"
    | "submit_claim"
    | "request_human_escalation"
    | "download_dossier";
  target_route: string;
  action_label: string;
};

export type DecisionFlowResponse = {
  case_id: string;
  case_code: string;
  policy_claims: PolicyTermCitation[];
  financial_summary: FinancialSummaryBreakdown;
  claim_verification: ClaimVerificationStatus;
  decision: DecisionOutcome;
  escalation: HumanEscalationDossier;
  next_steps: UserNextStep[];
};
