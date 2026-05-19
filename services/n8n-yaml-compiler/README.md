# n8n YAML Compiler

Runtime compiler service that translates YAML workflow/credential specs into n8n-native artifacts and deploys them via REST API + direct Postgres writes.

## API Endpoints

- `GET /healthz` — Health check
- `POST /deploy` — Deploy tenant assets
- `POST /diff` — Compare repo vs live n8n
- `POST /migrate` — Pull live workflows into repo
- `GET /audit` — Query audit log
- `POST /credentials/encrypt` — Encrypt credential data

## Environment

See `knowledge/operations/n8n-compiler-runbook.md` for full env var reference.

Key vars:
- `N8N_API_URL`, `N8N_API_KEY` — Target n8n instance
- `N8N_ENCRYPTION_KEY` — Must match n8n instance
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SCHEMA` — Postgres connection
- `COMPILER_TOKEN` — Bearer auth for CLI

## Audit

Every deployment writes to `agentyx_audit.n8n_change_log` with full Git provenance, agent skill, and node-level diffs.
