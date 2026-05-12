# Customer Service KB Search v2 (Levinnovation)

Hybrid retrieval webhook for the customer-service RAG pipeline.

## Endpoint

- **Method:** `POST`
- **Path:** `/webhook/kb/search`
- **Webhook ID:** `kb-search-levinnovation` (same URL as the legacy v1 webhook)

## Request body

```json
{
  "query": "¿Qué es Agentyx?",
  "product": "Agentyx",
  "top_k": 6
}
```

- `query` (required) — free-text search query
- `product` (optional) — filter by product tag (Agentyx, Contax, Acumatica, Oosto, Metropolis, Legalink, Pricing, CaseStudy, FAQ, General)
- `top_k` (optional, default 6) — number of results to return

## Response body

```json
{
  "ok": true,
  "kb_context": "#1 [Agentyx] Agentyx...",
  "snippets": [
    {
      "id": "...",
      "product": "Agentyx",
      "title": "agentyx.md",
      "url": "https://agentyx.app",
      "text": "...",
      "score": 0.015
    }
  ],
  "hit_count": 3
}
```

## Retrieval logic

1. **Embed query** — OpenAI `text-embedding-3-small` (1536-dim).
2. **Hybrid search SQL CTE:**
   - `v` — cosine similarity top-30 from `cs_knowledge_chunks` (HNSW index)
   - `f` — `websearch_to_tsquery('spanish', query)` BM25 top-30 (GIN index on `tsv`)
   - `fused` — RRF fusion (`1/(60+rank)`) with a `-0.05` penalty for `source='static'` rows
3. **Return top-k** results formatted as bulleted excerpts.

## Required env vars

- `KB_EMBEDDING_MODEL` — default `text-embedding-3-small`
- `OPENAI_API_KEY` — OpenAI API credential

## Postgres credentials

Uses the same Postgres account as other levinnovation workflows (`Postgres account`, id `sFReUGjhi6Ox1tYR`).
