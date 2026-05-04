# Postgres

Railway Postgres plugin. Provides a single Postgres instance shared across multiple logical databases.

## Logical databases

- `n8n` — n8n execution history and credentials metadata
- `langfuse` — Langfuse trace events
- `librechat` — LibreChat conversation storage
- `paperclip` — Paperclip orchestration state

## Connection

Services connect via Railway's `${{Postgres.DATABASE_URL}}` variable.
Each service appends its own `?schema=<name>` to keep tables isolated.

## Scaling note

If any single service outgrows shared Postgres, split it to a dedicated Railway database plugin and update the corresponding `*_DATABASE_URL` variable.
