# Product Requirements

## User
A Paytm user facing a hospital expense who needs clear insurance and funding guidance.

## MVP user journey
1. Describe the situation by text or Hindi/Hinglish voice.
2. Create a medical-claim case.
3. Upload a policy and hospital documents.
4. Digitize/extract facts and show uncertain fields for confirmation.
5. Calculate claim readiness and list missing items.
6. Show evidence for policy answers.
7. Calculate a planning-only financial gap.
8. Explain a mock claim status.
9. Set a reminder or prepare escalation through n8n.

## Required screens
- Home/intake
- Case dashboard
- Document upload and extraction review
- Evidence drawer
- Claim readiness and financial map
- Claim tracking and escalation

## Non-functional requirements
- Mobile-first responsive UI.
- Every displayed financial/policy claim has source or explicit uncertainty.
- No cross-case data leakage.
- All write/irreversible actions require confirmation.
- Demo must work with seeded data if external AI/API calls fail.
