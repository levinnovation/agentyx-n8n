# Customer Service KB Sync v2 (Levinnovation)

Ingestion workflow that syncs knowledge-base sources into `cs_documents` + `cs_knowledge_chunks`.

## Triggers

- **Schedule** — daily at 02:00 UTC (`0 2 * * *`)
- **Manual** — for on-demand re-sync

## Sources

1. **Google Drive** — files under `GDRIVE_ROOT_FOLDER_ID` (default `1natyxyUOlUN-qba-zTlBWB-Qqf_RaO1P`)
   - Supported: Docs, Sheets, PDFs, plain text
2. **Static catalog stubs** — `static-catalog.json` from this repo
   - Fallback paragraphs for the five LEV products (tagged `source='static'`)

## Pipeline

1. **List sources** — Drive API + raw GitHub JSON
2. **Extract text** — Drive exports or static passthrough
3. **Normalize + hash** — FNV-1a hash of cleaned text
4. **Check hash** — skip unchanged docs via `cs_documents.content_hash`
5. **Upsert `cs_documents`** — doc-level metadata with version bump
6. **Delete old chunks** — `DELETE FROM cs_knowledge_chunks WHERE doc_id = ...`
7. **Recursive chunk** — 1200 chars / 150 overlap
8. **LLM product tag** — OpenRouter Gemini Flash, batched 10 chunks per call
9. **Embed chunks** — OpenAI `text-embedding-3-small`, batched 96 per call
10. **Bulk insert chunks** — `INSERT INTO cs_knowledge_chunks (...)`

## Schema

Managed by migration `002_customer_service_kb.sql`:

- `cs_documents(id, source, source_id, product, title, url, mime, raw_text, content_hash, version, created_at, updated_at)`
- `cs_knowledge_chunks(id, text, metadata, embedding vector(1536), doc_id, chunk_index, chunk_type, tsv tsvector, created_at)`

## Required env vars

- `GDRIVE_ACCESS_TOKEN` — OAuth bearer for Google Drive API
- `GDRIVE_ROOT_FOLDER_ID` — root folder to crawl
- `KB_EMBEDDING_MODEL` — default `text-embedding-3-small`
- `KB_STATIC_SOURCES_URL` — raw URL to `static-catalog.json` (optional, has default)
- `OPENROUTER_API_KEY` — for Gemini Flash product tagging

## Credentials

- **Postgres** — `Postgres account` (`sFReUGjhi6Ox1tYR`)
- **OpenAI** — `OpenAI account` (`1s2rxxG7tkEeB7UH`)

## Notes

- Static stubs are down-ranked by 0.05 at retrieval time; Drive content wins ties.
- If a Drive doc hasn't changed (hash match), embedding is skipped entirely.
- The migration is additive; existing `cs_knowledge_chunks` data is preserved.
