# Agentic Coding Instructions

You are modifying Paytm Sahaayak. Before coding:
1. Inspect the repository and current package versions.
2. Read the relevant docs in this directory.
3. Identify the smallest vertical slice.
4. Preserve existing working code.

## Implementation rules
- Use typed contracts and small modules.
- Never invent an API or package behavior; inspect installed packages/docs.
- Keep financial logic deterministic and tested.
- Keep external integrations behind service adapters.
- Use demo/mock adapters when credentials are absent.
- Do not place secrets in source.
- Run relevant tests/lint/build after edits.
- Report changed files, commands run, and remaining limitations.

## Agent roles
- LangGraph supervisor routes to narrow workers.
- Document worker uses Sarvam/PDF fallback and emits facts with evidence.
- Evidence worker uses Cognee and case-scoped retrieval.
- Rules worker calculates readiness/gap; it does not use an LLM.
- Automation worker triggers n8n; it cannot submit without confirmation.
