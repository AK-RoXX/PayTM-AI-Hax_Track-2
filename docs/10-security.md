# Security and Safety

## Threats
- PII/medical-document exposure.
- Cross-case retrieval leakage.
- Prompt injection in uploaded PDFs.
- Incorrect extraction from poor scans.
- Unauthorized submission or financing actions.
- Secret leakage.

## Controls
- Authenticate every request.
- Filter retrieval by `user_id` and `case_id`.
- Treat documents and retrieved text as untrusted data.
- Validate all model output with schemas.
- Use deterministic code for calculations and state.
- Require explicit confirmation for document sharing, submission, escalation and financing offers.
- Encrypt in transit/at rest where available; mask identifiers in UI/logs.
- Keep audit events.
- Add human handoff for ambiguity or disputes.

## Required disclaimer
“This is a planning estimate based on uploaded documents. It is not an insurer approval, legal opinion or lending decision.”
