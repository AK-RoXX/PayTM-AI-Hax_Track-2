# Frontend Guidelines

## UX goal
Make a stressful journey feel calm, guided and actionable. The product is mobile-first and should resemble an embedded financial-service experience, but must not falsely claim to be the production Paytm app.

## Main components
- `IntakeComposer`: text, voice and upload entry.
- `CaseHeader`: case ID, patient relation, urgency.
- `FinancialMap`: bill, possible coverage, planning gap.
- `ReadinessCard`: score, verified items, blockers.
- `EvidenceDrawer`: document, page, section and quote.
- `Timeline`: case/claim events.
- `ActionCard`: one next best action.
- `ConfirmationModal`: required before submission, sharing or financing.

## UI labels
Use “possible coverage”, “planning estimate”, “needs verification”, and “final decision by insurer”. Do not show “approved coverage” unless returned by a trusted partner API.

## Demo states
Seed a complete happy path plus missing-document and pending-claim states. Provide graceful loading/error states and text input fallback if voice fails.
