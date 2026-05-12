# Change Record: Customer-Service RAG Rebuild (Levinnovation)

**Date:** 2026-05-12  
**Tenant:** levinnovation  
**Domain:** customer-service  
**Affected assets:** Postgres schema, n8n workflows (3), static data stubs, system prompt

## What changed

1. **Schema migration** (`002_customer_service_kb.sql`)
   - Created `cs_documents` table for doc-level tracking.
   - Added `doc_id`, `chunk_index`, `chunk_type`, `tsv` columns to `cs_knowledge_chunks` (additive ALTER).
   - Added HNSW (`vector_cosine_ops`), GIN (`tsv`), and btree indexes.
   - Applied to Railway Postgres production database.

2. **Fallback product-catalog stubs**
   - New directory: `tenants/levinnovation/assets/data/product-catalog/`
   - Stubs for Agentyx, Contax, Acumatica, Oosto+Metropolis, Legalink + `README.md` + `static-catalog.json`.

3. **KB Search v2** (`customer-service-kb-search.json`)
   - Replaces legacy `kb-postgres-search.json` at same `/webhook/kb/search` URL.
   - OpenAI 1536-dim query embedding + RRF SQL hybrid retrieval (cosine + BM25).
   - Static-source penalty of `-0.05` so Drive content wins ties.

4. **KB Sync v2** (`customer-service-kb-sync.json`)
   - Replaces legacy `gdrive-kb-sync-postgres.json`.
   - Dual sources: Google Drive + static catalog.
   - Recursive chunking (1200/150), LLM product tag (Gemini Flash), batched OpenAI embedding.
   - Content-hash skip, doc/chunk upsert via `cs_documents`.

5. **Customer Service Core cleanup**
   - Removed broken `Postgres PGVector Store` + `Embeddings Google Gemini` nodes.
   - Updated system prompt with product anchors (`CATÁLOGO DE PRODUCTOS`) and `REGLA DE GROUNDING`.
   - Synced `activeVersion.nodes` with top-level nodes to avoid drift.

## Env vars to verify on `agx-demo-n8n`

- `KB_EMBEDDING_MODEL` → `text-embedding-3-small`
- `KB_STATIC_SOURCES_URL` → `https://raw.githubusercontent.com/levinnovation/agentyx-vertical-assets/main/tenants/levinnovation/assets/data/product-catalog/static-catalog.json`
- `OPENROUTER_API_KEY` — required for LLM tagging in KB Sync v2
- `GDRIVE_ACCESS_TOKEN` — should already exist (used by legacy sync)
- `GDRIVE_ROOT_FOLDER_ID` — already set to `1natyxyUOlUN-qba-zTlBWB-Qqf_RaO1P`

## Next steps (manual)

1. Import the three new workflow JSONs into n8n (deactivate legacy workflows first).
2. Manually trigger **KB Sync v2** and verify row counts.
3. Deactivate duplicate `Customer Service Core (Levinnovation)` workflow `DkUYZC1qfQFgYR5O`.
4. Run smoke tests on Telegram + Kapso WA.

## Verification queries

```sql
SELECT count(*) FROM cs_documents;
SELECT count(*) FROM cs_knowledge_chunks;
SELECT count(DISTINCT metadata->>'product') FROM cs_knowledge_chunks;
```
