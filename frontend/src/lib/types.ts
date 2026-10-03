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
  disclaimer: string;
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