# Postgres

Railway Postgres plugin. Provides a single Postgres instance with one shared database and per-service schemas.

## Shared database and schemas

- Shared database: `railway`
- Service schemas:
  - `n8n` — n8n execution history and credentials metadata
  - `langfuse` — Langfuse trace events
  - `librechat` — LibreChat conversation storage
  - `paperclip` — Paperclip orchestration state
  - `better_auth` — Better Auth user sessions and OIDC data

## Connection

Services connect via Railway's `${{Postgres.DATABASE_URL}}` variable.
Each service appends its own `?schema=<name>` to keep tables isolated.

## Scaling note

If any single service outgrows shared Postgres, split it to a dedicated Railway database plugin and update the corresponding `*_DATABASE_URL` variable.
