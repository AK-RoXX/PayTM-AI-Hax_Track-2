# API Contract

Base URL: `/api/v1`. Return JSON. Use `case_id` on all case-scoped requests.

## Core endpoints

```text
POST /cases
GET /cases/{case_id}
POST /cases/{case_id}/messages
POST /cases/{case_id}/voice/transcribe
POST /cases/{case_id}/documents
GET /cases/{case_id}/documents
GET /cases/{case_id}/readiness
GET /cases/{case_id}/evidence
GET /cases/{case_id}/policy-terms
GET /cases/{case_id}/documents/{document_id}/bill-lines
PUT /cases/{case_id}/documents/{document_id}/bill-lines
GET /cases/{case_id}/policy-assessment
POST /cases/{case_id}/policy-assessment
POST /cases/{case_id}/ask
POST /cases/{case_id}/claim-draft
POST /cases/{case_id}/claim-submit/confirm
GET /cases/{case_id}/claim-status
POST /cases/{case_id}/reminders
POST /cases/{case_id}/financing-consent
GET /cases/{case_id}/loan-offers
POST /integrations/n8n/callback
```

## Financial response

```json
{
  "hospital_estimate": 300000,
  "possible_coverage": 300000,
  "estimated_gap": 0,
  "status": "planning_estimate",
  "calculation_status": "sum_insured_ceiling_only",
  "possible_coverage_basis": "sum_insured_ceiling_only",
  "estimated_gap_basis": "minimum_gap_before_policy_adjustments",
  "disclaimer": "This is only a sum-insured ceiling, not an expected payout. Policy limits and conditions are not applied."
}
```

`possible_coverage` is an upper ceiling and `estimated_gap` is a minimum gap until a complete bill is itemised and policy rules are assessed. The case response does not imply that the insurer will pay that amount.

`GET /cases/{case_id}/policy-terms` returns candidate products only when the uploaded policy document has a high-confidence exact UIN and sum insured. The response includes the extracted document/page/quote and matching catalog source. A product-level prospectus candidate still requires user confirmation against the insured person's active schedule.

Hospital bill OCR produces draft rows only. `GET /cases/{case_id}/documents/{document_id}/bill-lines` returns those proposals, their source page and quote, the high-confidence bill total, and whether the user has confirmed a complete itemisation. The user can correct, categorise, add, or remove rows. `PUT` accepts:

```json
{
  "confirmed_complete": false,
  "items": [
    {"line_id": "row-1", "description": "Room rent", "category": "room_rent", "amount": 60000, "quantity": 4, "source_page": 2, "source_quote": "Room rent 4 days ₹60,000"},
    {"line_id": "row-2", "description": "Pharmacy", "category": "pharmacy", "amount": 40000, "quantity": null, "source_page": 3, "source_quote": "Pharmacy ₹40,000"}
  ]
}
```

Set `confirmed_complete` to `true` only after all rows are reviewed, every row is categorised, room/ICU day counts are entered, and the rows reconcile to the extracted total within ₹1. The server persists the reviewed itemisation against the selected case-owned bill and invalidates prior scenarios for that bill.

`POST /cases/{case_id}/policy-assessment` then accepts only the policy and bill references and the user's confirmations; bill rows are read from the saved, confirmed review rather than supplied again:

```json
{
  "policy_document_id": "case-owned-policy-document-id",
  "bill_document_id": "case-owned-hospital-estimate-id",
  "policy_uin": "NIAHLIP25040V102425",
  "schedule_confirmed": true,
  "proportionate_deduction_applicability": "unknown"
}
```

The API requires authenticated case ownership, both documents to be processed in that case, confirmation that the active schedule matches, a high-confidence UIN and sum insured from the same selected policy document, and a confirmed line-item review reconciled to the bill total. The deterministic result is persisted with its input snapshot, catalog version, and source document timestamps. `GET /cases/{case_id}/policy-assessment` returns the latest saved result as `current`, `stale`, or `not_calculated`; a bill edit invalidates earlier scenarios. Results are scenario ranges before unmodelled policy conditions, never a coverage confirmation, claim approval, settlement, or lending decision. Unsupported evidence is rejected; rules are never borrowed from another insurer.

The result's `itemized_lines` contain the billed amount, known daily limit, modelled amount/range, bill page/quote, and product-reference title/UIN/pages plus the relevant source wording for each line. Room, boarding, and nursing rows share one daily cap; when several rows share it, the allowed amount is allocated pro rata for display. Formula explanations are generated from the checked-in catalog; source wording is separately quoted. The product-level catalog currently contains one reviewed product and does not replace policy wording, schedule, endorsements, or insurer adjudication.

Apply `supabase/migrations/20261003000000_policy_scenarios.sql` before enabling bill review or saved scenarios. The migration adds JSON bill-review fields to `documents` and a case-scoped `policy_assessments` table. FastAPI writes through the service role only after verifying the authenticated case owner.

## API rules

- Validate request and response schemas.
- Authenticate and scope every case query.
- Use idempotency keys for write actions.
- Return source evidence with policy answers.

## Document upload

`POST /cases/{case_id}/documents` accepts one `multipart/form-data` field named `file` and requires the caller's Supabase access token as a bearer token. The server verifies case ownership, stores the original in the private `documents` bucket, extracts text, creates embeddings, and returns the final processing status. The upload screen sends each selected file independently so one failure does not block the rest.

Supported files are PDF, JPG, JPEG, PNG, WEBP, and DOCX, up to 20 MB per file. Searchable PDFs and DOCX files use native text extraction; scanned PDFs and images use the configured OCR providers (`sarvam`, `gemini`) in `OCR_PROVIDER_ORDER`. WEBP is converted to PNG for Sarvam. Sarvam accepts at most 10 PDF pages per job, so larger scanned PDFs are split into jobs of up to 10 pages; Gemini supports PDFs up to 1,000 pages. Gemini interactions use `store=false`.

`GET /cases/{case_id}/documents` returns case-scoped processing states and errors. Successful processing stores page-linked chunks and 384-dimensional vectors in `public.chunks.embedding_384`.
