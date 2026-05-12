# ADR-0029: Customer-Service RAG Rebuild for Levinnovation

**Status:** Accepted  
**Date:** 2026-05-12

## Context

The levinnovation customer-service agent was generic because its RAG pipeline had multiple structural failures:

1. **No product anchors** in the system prompt — zero references to Agentyx, Contax, Acumatica, Oosto, Metropolis, or Legalink.
2. **Broken vector retrieval** — a `vectorStorePGVector` retrieve-as-tool used `embeddingsGoogleGemini` (default 768-dim) against a `vector(1536)` column, causing runtime dimension mismatch.
3. **Ineffective search** — the hot-path KB Search webhook ran `text ILIKE '%query%'` substring matches; vectors were never consulted.
4. **Naive chunking** — the sync workflow stored single 12 000-char chunks per file with no product tags.
5. **Schema drift** — pgvector DDL lived only in an inactive n8n workflow; only `001_better_auth_public_org_and_audit.sql` was under VCS.
6. **Duplicate core workflows** — two `Customer Service Core (Levinnovation)` workflows were simultaneously active.

## Decision

Rebuild the pipeline end-to-end with the following choices:

1. **Single embedder:** OpenAI `text-embedding-3-small` (1536-dim) for both ingestion and query.
2. **Hybrid retrieval:** pgvector cosine similarity + Postgres `tsvector` BM25 fused via RRF (Reciprocal Rank Fusion) in a single SQL CTE.
3. **Structured chunking:** recursive character splitter (1200 chars, 150 overlap) with per-chunk `chunk_index` and `chunk_type`.
4. **Per-chunk product tagging:** batched LLM calls (Gemini Flash via OpenRouter) with a strict enum.
5. **Versioned schema:** additive migration `002_customer_service_kb.sql` committed to `tenants/levinnovation/assets/deploy/railway/migrations/`.
6. **Dual sources:** Google Drive (authoritative) + committed static stubs (fallback, down-ranked).
7. **Doc-level tracking:** new `cs_documents` table with `content_hash` skip-if-unchanged.
8. **Core cleanup:** remove broken Gemini/PGVector nodes; add product anchors + grounding rule to system prompt; deactivate duplicate legacy workflow.

## Consequences

### Positive

- Retrieval quality improves from substring-match to semantic + lexical hybrid.
- Product-specific queries are grounded and cite real KB excerpts.
- Schema is versioned and reproducible across environments.
- Unchanged Drive files skip re-embedding, reducing API costs.
- Static stubs guarantee the agent never claims "no tenemos productos con ese nombre".

### Negative

- Additional dependency on OpenRouter API key for product tagging in sync workflow.
- Slightly higher latency on KB Search due to two-stage embed + SQL CTE.
- Migration requires manual `psql` execution (not yet automated in CI).

## Rejected alternatives

- **Keep Gemini 768-dim + re-create table as vector(768)** — would break existing 1536-dim data and require full re-ingestion.
- **Use a separate full-text search engine (Meilisearch)** — adds another service to operate; Postgres tsvector is sufficient for Spanish text.
- **LangChain native document loaders** — less controllable than custom code nodes; harder to version in Git.

## Follow-up

- Monitor OpenRouter cost for Gemini Flash tagging batched at 10 chunks/request.
- Add CI step to validate migration SQL on a scratch Postgres instance.
- Evaluate upgrading from `websearch_to_tsquery` to `plainto_tsquery` if user queries generate too many tsquery syntax errors.
