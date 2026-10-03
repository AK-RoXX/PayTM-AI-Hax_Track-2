# Data Model

## Tables

- `profiles`: user identity metadata; avoid storing unnecessary PII.
- `cases`: case state, type, urgency, amounts, readiness and next action.
- `documents`: storage path, type, processing state, and OCR provider.
- `chunks`: page-linked extracted text and case-scoped vector embeddings.
- `document_extractions`: raw/normalized extraction result and quality.
- `case_facts`: typed facts with source document/page/quote/confidence.
- Policy product rules: versioned JSON catalog in `backend/app/data/policy_catalog.json`, keyed by exact UIN and validated as typed `PolicyTerms` models. These are reviewed product references, not user-specific contracts.
- `evidence_items`: claims and supporting excerpts.
- `case_events`: immutable timeline events.
- `actions`: pending/completed actions and confirmation requirements.
- `messages`: user/assistant messages.
- `consents`: data-sharing and financing consent records.
- `audit_logs`: actor, action, timestamp and result.

## Source of truth

Postgres owns case status, numbers, consent, actions and audit data. Cognee is a retrieval/memory layer and must not silently overwrite authoritative values.

## Required fields

Every extracted financial fact should include `source_document_id`, `source_page`, `source_quote`, `confidence`, `verification_status`.

Policy UIN and sum-insured facts are matched only within the same case-owned policy document. Numeric product terms include their source document and pages. A scenario requires the user to confirm that those product terms match the active policy schedule and requires itemised bill lines to reconcile to the bill total. Scenario calculations are returned by the case API and are not persisted as insurer-approved coverage.

Document text is embedded with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` through FastEmbed (384 dimensions) and stored in `chunks.embedding_384`. The selected OCR or native text-processing provider is recorded in `documents.processing_provider`. The earlier `embedding` column is retained as an unused placeholder for migration safety.

## Privacy

Use UUIDs, masked identifiers, row-level security, encrypted storage, retention rules and separate demo data.
