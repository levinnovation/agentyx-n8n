# KB Sync - Google Drive to Postgres (Levinnovation)

This workflow polls Google Drive and indexes changed files into `lev_knowledge` tables in Postgres.

## What it does

1. Runs every 15 minutes.
2. Lists Drive files and filters to:
   - Files under the configured root folder and descendants.
   - Files changed after last sync cursor.
   - Supported MIME types (plain text, PDF, Google Docs, Google Sheets).
3. Downloads file content.
4. Generates embeddings (`text-embedding-3-small` by default).
5. Upserts into:
   - `lev_knowledge.documents`
   - `lev_knowledge.document_chunks` (single chunk per file in current version)
6. Updates workflow static cursor `gdrive_last_sync_at`.

## Required env vars

- `GDRIVE_ROOT_FOLDER_ID` (defaults to `1natyxyUOlUN-qba-zTlBWB-Qqf_RaO1P`)
- `GDRIVE_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `KB_EMBEDDING_MODEL` (optional, default `text-embedding-3-small`)

## Required n8n credential

Set the Postgres node credential in both Postgres nodes:

- `Upsert Document`
- `Upsert Vector Chunk`

The placeholder id/name in JSON must be replaced with your real n8n Postgres credential.
