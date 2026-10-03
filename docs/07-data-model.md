# Data Model

## Tables

- `profiles`: user identity metadata; avoid storing unnecessary PII.
- `cases`: case state, type, urgency, amounts, readiness and next action.
- `documents`: storage path, type, processing state, and OCR provider.
- `chunks`: page-linked extracted text and case-scoped vector embeddings.
- `document_extractions`: raw/normalized extraction result and quality.
- `case_facts`: typed facts with source document/page/quote/confidence.
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

Document text is embedded with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` through FastEmbed (384 dimensions) and stored in `chunks.embedding_384`. The selected OCR or native text-processing provider is recorded in `documents.processing_provider`. The earlier `embedding` column is retained as an unused placeholder for migration safety.

## Privacy

Use UUIDs, masked identifiers, row-level security, encrypted storage, retention rules and separate demo data.
