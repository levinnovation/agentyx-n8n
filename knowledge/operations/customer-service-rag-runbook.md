# Customer Service RAG Runbook

## Purpose

End-to-end runbook for operating the levinnovation customer-service RAG pipeline: apply schema changes, ingest sources, verify retrieval, and troubleshoot.

## Prerequisites

- Railway CLI logged in (`railway login`)
- `psql` installed locally
- Access to n8n instance (`https://webhooks.n8n.agentyx.one`)
- `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GDRIVE_ACCESS_TOKEN` available

## 1. Apply schema migration

```bash
# From repo root
psql "$(railway variables --service Postgres | grep DATABASE_PUBLIC_URL | awk '{print $2}')" \
  -f tenants/levinnovation/assets/deploy/railway/migrations/002_customer_service_kb.sql
```

Verify:

```sql
\dt public.cs_documents
\dt public.cs_knowledge_chunks
SELECT * FROM pg_indexes WHERE tablename = 'cs_knowledge_chunks';
```

## 2. Set / verify env vars on `agx-demo-n8n`

```bash
railway variables --service agx-demo-n8n --set "KB_EMBEDDING_MODEL=text-embedding-3-small"
railway variables --service agx-demo-n8n --set "KB_STATIC_SOURCES_URL=https://raw.githubusercontent.com/levinnovation/agentyx-vertical-assets/main/tenants/levinnovation/assets/data/product-catalog/static-catalog.json"
```

Confirm these already exist:

- `GDRIVE_ACCESS_TOKEN`
- `GDRIVE_ROOT_FOLDER_ID`
- `OPENAI_API_KEY` (or OpenAI credential in n8n)
- `OPENROUTER_API_KEY`

## 3. Import workflows into n8n

1. **Deactivate legacy workflows first** (to avoid webhook path conflicts):
   - `KB Search - Postgres (Levinnovation)` (legacy)
   - `KB Sync - Google Drive to Postgres (Levinnovation)` (legacy)
   - `Customer Service Core (Levinnovation)` duplicate (`DkUYZC1qfQFgYR5O`)

2. **Import new workflows** (Settings → Import from File):
   - `tenants/levinnovation/assets/workflows/n8n/customer-service-kb-search/customer-service-kb-search.json`
   - `tenants/levinnovation/assets/workflows/n8n/customer-service-kb-sync/customer-service-kb-sync.json`
   - `tenants/levinnovation/assets/workflows/n8n/customer-service-core/customer-service-core.json`

3. **Activate** the imported workflows.

4. **Verify webhook URL** — KB Search v2 should respond at:
   ```
   POST https://levinnovation.n8n.agentyx.one/webhook/kb/search
   ```

## 4. Run KB Sync v2 (manual trigger)

In n8n, open **Customer Service KB Sync v2 (Levinnovation)** and click **Test Workflow** (Manual Trigger).

Expected behavior:
- Drive files listed and filtered to root folder
- Static catalog fetched from GitHub raw URL
- Unchanged docs skipped (hash match)
- New/changed docs chunked, tagged, embedded, and inserted

## 5. Verify counts

Connect to Postgres and run:

```sql
-- Doc-level tracking
SELECT count(*) FROM cs_documents;

-- Chunk-level tracking
SELECT count(*) FROM cs_knowledge_chunks;

-- Product distribution
SELECT metadata->>'product' as product, count(*) as chunks
FROM cs_knowledge_chunks
GROUP BY metadata->>'product'
ORDER BY chunks DESC;

-- Verify HNSW index is used (check with EXPLAIN)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, 1 - (embedding <=> '[...]'::vector) AS score
FROM cs_knowledge_chunks
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

## 6. Test KB Search v2 directly

```bash
curl -X POST https://levinnovation.n8n.agentyx.one/webhook/kb/search \
  -H "Content-Type: application/json" \
  -d '{"query":"¿Qué es Agentyx?","product":"Agentyx","top_k":3}'
```

Acceptance: returns `ok: true`, `hit_count > 0`, and `score > 0` for at least one snippet.

## 7. Smoke tests (Telegram + Kapso WA)

Send these prompts and confirm behavior:

| Prompt | Expected behavior |
|--------|-------------------|
| "¿Cuáles son los productos de LEV Innovation?" | Enumerates 5 products, cites at least one doc per available product |
| "¿Qué es Agentyx?" | Cites Drive doc or stub for Agentyx with URL |
| "¿Contax integra con Acumatica?" | Returns chunks tagged Contax + Acumatica; agent answers grounded |
| "Precios orientativos de Agentyx" | If no Pricing chunks, agent says "no encuentro información indexada, lo escalo" |

## 8. Troubleshooting

### KB Search returns empty results

1. Check that `cs_knowledge_chunks` has rows.
2. Verify the query embedding call succeeds (check OpenAI credential).
3. Test the RRF SQL manually in `psql` with a hardcoded vector and query text.
4. Ensure `tsv` column was generated (additive ALTER may have failed silently if pgvector extension was missing).

### KB Sync fails on Drive download

1. Verify `GDRIVE_ACCESS_TOKEN` is valid and not expired.
2. Check `GDRIVE_ROOT_FOLDER_ID` matches the intended folder.
3. Ensure the Drive API quota hasn't been exceeded.

### LLM tagging returns "General" for everything

1. Check `OPENROUTER_API_KEY` is set and valid.
2. Verify the OpenRouter API response in n8n execution logs.
3. The regex fallback (`/\{.*\}/s`) may fail if Gemini returns markdown fences; adjust `Distribute Tags` code node if needed.

### Postgres dimension mismatch

If you see `expected 1536 dimensions, not X`:
- Ensure `KB_EMBEDDING_MODEL` is `text-embedding-3-small` (1536-dim).
- Do NOT use `text-embedding-3-large` or Gemini embeddings without updating the migration.

## 9. Rollback

To revert to the legacy pipeline:

1. Deactivate the three v2 workflows.
2. Re-activate the legacy workflows:
   - `KB Search - Postgres (Levinnovation)`
   - `KB Sync - Google Drive to Postgres (Levinnovation)`
   - Original `Customer Service Core (Levinnovation)` (`n0mTwpONyCbbyn2E`)
3. The new schema columns (`doc_id`, `chunk_index`, `chunk_type`, `tsv`) are additive and harmless to legacy workflows.

## References

- Migration: `tenants/levinnovation/assets/deploy/railway/migrations/002_customer_service_kb.sql`
- ADR: `knowledge/decisions/0029-customer-service-rag-rebuild.md`
- Change record: `knowledge/change-log/2026-05-12-customer-service-rag-rebuild.md`
- Workflows:
  - `tenants/levinnovation/assets/workflows/n8n/customer-service-kb-search/`
  - `tenants/levinnovation/assets/workflows/n8n/customer-service-kb-sync/`
  - `tenants/levinnovation/assets/workflows/n8n/customer-service-core/`
