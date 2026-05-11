# KB Search - Postgres (Levinnovation)

Webhook search endpoint for runtime KB retrieval from Postgres.

## Endpoint

- `POST /webhook/kb/search`
- Body:
  - `query` (string)

## Response

- `ok`
- `kb_context` (combined snippet text)
- `snippets` (array with file/chunk summaries)
- `hit_count`

This workflow is designed to be called by `customer-service-core` before the AI agent runs, so responses include relevant knowledge snippets from `lev_knowledge`.
