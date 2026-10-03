# Testing

## Unit tests
- Readiness score with each document missing.
- Gap calculation and zero/negative handling.
- Case-state transition permissions.
- Evidence-required answer validation.
- User/case retrieval isolation.

## AI tests
- Policy clause is cited for room-rent question.
- Missing clause causes abstention.
- Malicious instruction inside PDF is ignored.
- Low-quality extraction requires confirmation.
- Claim-status answer calls the status tool.

## Integration tests
- Upload -> extraction -> facts -> Cognee -> readiness.
- LangGraph -> n8n webhook -> callback -> timeline.
- Confirmation gate prevents unapproved action.

## Demo fallback
Seeded case data must render even when Sarvam, Cognee or n8n is unavailable.
