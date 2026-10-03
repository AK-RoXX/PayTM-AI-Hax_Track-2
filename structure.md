paytm-sahaayak/
│
├── docs/
│   ├── 00-overview.md
│   ├── 01-product-requirements.md
│   ├── 02-architecture.md
│   ├── ...
│   └── 15-implementation-plan.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── case/[caseId]/page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   └── track/page.tsx
│   │   ├── components/
│   │   │   ├── case/
│   │   │   │   ├── CaseHeader.tsx
│   │   │   │   ├── FinancialMap.tsx
│   │   │   │   ├── ClaimReadinessCard.tsx
│   │   │   │   ├── CaseTimeline.tsx
│   │   │   │   ├── EvidenceDrawer.tsx
│   │   │   │   └── NextActionCard.tsx
│   │   │   ├── intake/
│   │   │   │   ├── IntakeComposer.tsx
│   │   │   │   └── VoiceInput.tsx
│   │   │   └── ui/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   └── data/
│   │       └── demoCase.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── cases.py
│   │   │   ├── documents.py
│   │   │   ├── chat.py
│   │   │   ├── claims.py
│   │   │   └── integrations.py
│   │   ├── schemas/
│   │   │   ├── case.py
│   │   │   ├── document.py
│   │   │   ├── evidence.py
│   │   │   └── actions.py
│   │   ├── agents/
│   │   │   ├── graph.py
│   │   │   ├── intake_agent.py
│   │   │   ├── document_agent.py
│   │   │   ├── evidence_agent.py
│   │   │   ├── status_agent.py
│   │   │   └── explanation_agent.py
│   │   ├── engines/
│   │   │   ├── readiness_engine.py
│   │   │   ├── finance_engine.py
│   │   │   └── workflow_engine.py
│   │   ├── services/
│   │   │   ├── sarvam_service.py
│   │   │   ├── cognee_service.py
│   │   │   ├── n8n_service.py
│   │   │   ├── document_service.py
│   │   │   └── mock_claim_service.py
│   │   ├── repositories/
│   │   │   ├── case_repository.py
│   │   │   └── demo_repository.py
│   │   └── seed/
│   │       └── demo_case.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
└── n8n/
    ├── missing-document-reminder.json
    └── claim-delay-escalation.json