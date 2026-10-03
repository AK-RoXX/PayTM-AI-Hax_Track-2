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
  "possible_coverage": 220000,
  "estimated_gap": 80000,
  "calculation": "₹3,00,000 - ₹2,20,000 = ₹80,000",
  "status": "planning_estimate",
  "disclaimer": "Final coverage is determined by the insurer."
}
```

## API rules

- Validate request and response schemas.
- Authenticate and scope every case query.
- Use idempotency keys for write actions.
- Return source evidence with policy answers.

## Document upload

`POST /cases/{case_id}/documents` accepts one `multipart/form-data` field named `file` and requires the caller's Supabase access token as a bearer token. The server verifies case ownership, stores the original in the private `documents` bucket, extracts text, creates embeddings, and returns the final processing status. The upload screen sends each selected file independently so one failure does not block the rest.

Supported files are PDF, JPG, JPEG, PNG, WEBP, and DOCX, up to 20 MB per file. Searchable PDFs and DOCX files use native text extraction; scanned PDFs and images use the configured OCR providers (`sarvam`, `gemini`) in `OCR_PROVIDER_ORDER`. WEBP is converted to PNG for Sarvam. Sarvam accepts at most 10 PDF pages per job, so larger scanned PDFs are split into jobs of up to 10 pages; Gemini supports PDFs up to 1,000 pages. Gemini interactions use `store=false`.

`GET /cases/{case_id}/documents` returns case-scoped processing states and errors. Successful processing stores page-linked chunks and 384-dimensional vectors in `public.chunks.embedding_384`.
