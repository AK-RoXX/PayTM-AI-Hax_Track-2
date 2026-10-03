# Jobs and Processing

## Document processing pipeline

```text
Upload -> storage -> classify -> digitize/OCR -> schema extraction -> validate -> persist facts/evidence -> Cognee ingest -> readiness recalculation
```

The upload API currently processes each file synchronously. It uses PyMuPDF for searchable PDFs and python-docx for DOCX, then tries configured Sarvam Document AI and Gemini OCR providers in order for scanned PDFs and images. Text is split with page provenance, embedded with the configured multilingual FastEmbed model, and persisted to pgvector before the document is marked done. Gemini interactions disable provider-side interaction storage. If no OCR provider is configured or all configured providers fail, the original remains stored and the document is marked failed; placeholder text or embeddings are never created.

## Async jobs

Use a simple background task or n8n for hackathon processing. Add a durable queue only if needed.

## n8n workflows

1. Missing document: webhook -> delay -> reminder -> callback event.
2. Claim pending: status webhook -> wait -> recheck -> escalation draft.
3. Claim submitted: acknowledgement -> follow-up check.

## Idempotency

Each job has `job_id`, `case_id`, `document_id`, status, attempt count, error and timestamps. Do not duplicate reminders or events on retry.
