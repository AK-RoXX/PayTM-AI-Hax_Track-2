# GitHub Integration

## Repository workflow
- `main`: stable demo branch.
- `develop`: integration branch if needed.
- Feature branches: `feat/frontend-case-dashboard`, `feat/langgraph-orchestrator`, `feat/sarvam-docs`, `feat/n8n-workflows`.

## Commits
Use small commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Pull requests
Every PR should state: problem, files changed, local run command, API changes, screenshots, tests, and known limitations.

## CI minimum
- Frontend install/lint/build.
- Backend install/import/pytest.
- Secret scan.
- No generated uploads or `.env` files.
