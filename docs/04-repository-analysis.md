# Repository Analysis

## Current starting point
The developer has already created `frontend/` and `backend/`, installed Node modules, and created a Python virtual environment with requirements. Preserve the existing setup; inspect `package.json`, `requirements.txt`, source folders and environment files before changing dependencies.

## First inspection commands
```bash
ls -la
find frontend -maxdepth 2 -type f | sort
find backend -maxdepth 3 -type f | sort
cat frontend/package.json
cat backend/requirements.txt
```

## Rules for coding agents
- Do not rewrite the project structure without checking existing files.
- Reuse installed packages.
- Make small vertical slices that run end-to-end.
- Never commit secrets or `.env` files.
- Keep API contracts synchronized between frontend and backend.
- Add a seeded demo mode before integrating every external service.
