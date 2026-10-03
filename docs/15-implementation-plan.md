# Implementation Plan

## First vertical slice
1. Start frontend and backend.
2. Add Supabase env/config or local demo repository.
3. Create `MED-82031` seed case.
4. Render dashboard with ₹3,00,000 estimate, ₹2,20,000 possible coverage, ₹80,000 planning gap, readiness 78%.
5. Add upload endpoint and document list.
6. Add one Sarvam document extraction path with fallback fixture.
7. Add Cognee ingestion/retrieval for one policy clause.
8. Add LangGraph intake -> rules -> explanation flow.
9. Add n8n missing-document reminder webhook.
10. Test end-to-end and rehearse demo.

## Definition of done
- User can create/view case.
- Documents are stored and classified.
- At least one policy answer displays evidence.
- Missing signed discharge summary is detected.
- Gap is calculated by backend code.
- Claim status explanation uses mock tool data.
- n8n reminder updates the timeline.
- Uncertain/unsupported answers abstain.
- No secrets are committed.

## Demo script
Voice/text emergency -> upload policy/bill -> readiness -> evidence -> “do not borrow ₹3L yet” -> claim pending explanation -> reminder/escalation.
