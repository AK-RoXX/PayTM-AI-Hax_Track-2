# Architecture

## High-level
```text
Next.js frontend
  -> FastAPI API gateway
      -> LangGraph stateful orchestration
          -> Intake / Document / Evidence / Status / Explanation workers
      -> Rules engine for readiness and financial calculations
      -> Supabase Postgres + Storage
      -> Cognee case memory and retrieval
      -> n8n webhook workflows
      -> mock insurer, hospital and lender tools
```

## Responsibility boundary
- LLM/agents: intent understanding, structured extraction, retrieval planning, explanation, multilingual response.
- Backend: calculations, readiness checks, authorization, state transitions, evidence validation, tool allowlists, submission gates.
- n8n: delayed reminders, notifications, escalation and support workflows.
- User: confirm document values and high-impact actions.

## Case state machine
`CASE_CREATED -> DOCUMENTS_COLLECTING -> DOCUMENTS_PROCESSING -> FACTS_NEED_CONFIRMATION -> CLAIM_READINESS_CHECKED -> ACTION_REQUIRED -> READY_FOR_SUBMISSION -> USER_REVIEW_REQUIRED -> CLAIM_SUBMITTED -> INSURER_REVIEW -> RESOLVED/ESCALATION_REQUIRED`

## Retrieval order
1. Scope by authenticated `user_id` and active `case_id`.
2. Check structured verified facts in Postgres.
3. Retrieve policy/case evidence from Cognee.
4. Optionally use keyword plus vector retrieval/reranking.
5. Answer only from evidence; otherwise abstain.
