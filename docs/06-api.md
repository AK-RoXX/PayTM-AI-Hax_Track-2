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

`GET /cases/{case_id}/policy-terms` only returns product terms when an uploaded policy document has a high-confidence exact UIN and sum insured. The response includes the extracted document/page/quote and matching catalog source. It marks the result as requiring confirmation against the insured person's active schedule.

`POST /cases/{case_id}/policy-assessment` accepts:

```json
{
  "policy_document_id": "case-owned-policy-document-id",
  "bill_document_id": "case-owned-hospital-estimate-id",
  "policy_uin": "NIAHLIP25040V102425",
  "schedule_confirmed": true,
  "bill_items_confirmed": true,
  "proportionate_deduction_applicability": "unknown",
  "line_items": [
    {"description": "Room rent", "category": "room_rent", "amount": 60000, "quantity": 4, "source_page": 2},
    {"description": "Pharmacy", "category": "pharmacy", "amount": 40000, "source_page": 3}
  ]
}
```

The API requires authenticated case ownership, both documents to be processed in that case, confirmation that the active schedule matches, confirmation that the complete bill breakdown was reviewed, the UIN and sum insured to come from the same selected policy document, and line items to reconcile to the extracted bill total. Results are scenario ranges before unmodelled policy conditions. Unsupported or conflicting evidence is rejected; rules are never borrowed from another insurer.

## API rules

- Validate request and response schemas.
- Authenticate and scope every case query.
- Use idempotency keys for write actions.
- Return source evidence with policy answers.

## Document upload

`POST /cases/{case_id}/documents` accepts one `multipart/form-data` field named `file` and requires the caller's Supabase access token as a bearer token. The server verifies case ownership, stores the original in the private `documents` bucket, extracts text, creates embeddings, and returns the final processing status. The upload screen sends each selected file independently so one failure does not block the rest.

Supported files are PDF, JPG, JPEG, PNG, WEBP, and DOCX, up to 20 MB per file. Searchable PDFs and DOCX files use native text extraction; scanned PDFs and images use the configured OCR providers (`sarvam`, `gemini`) in `OCR_PROVIDER_ORDER`. WEBP is converted to PNG for Sarvam. Sarvam accepts at most 10 PDF pages per job, so larger scanned PDFs are split into jobs of up to 10 pages; Gemini supports PDFs up to 1,000 pages. Gemini interactions use `store=false`.

`GET /cases/{case_id}/documents` returns case-scoped processing states and errors. Successful processing stores page-linked chunks and 384-dimensional vectors in `public.chunks.embedding_384`.
