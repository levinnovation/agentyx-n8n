# Customer Service Core (Levinnovation)

Reusable sub-workflow for multi-channel customer service adapters.

## Input envelope

Provide one item with:

- `channel` — e.g. `kapso-wa`, `telegram`, `meta-comment`
- `conversation_id` — unique session ID
- `user_id` — sender identifier
- `message` — text content
- `attachments` — array of `{ type, url, mime_type }`
- `user_documents` — array of `{ id, title, visibility, summary_or_excerpt }`
- `document_visibility` — string: `"context_only"` (default, model may read but never share) or `"shareable"` (may attach/send via external tools)
- `metadata` — object with `contact_name`, `phone`, `email`, etc.

## Output envelope

Returns:

- `reply_text` — AI-generated response
- `reply_attachments` — array (currently empty)
- `end_session` — boolean
- `metadata` — structured lead data:
  - `lead_status`
  - `qualification_score`
  - `meeting_requested`
  - `crm_fields`
  - `calendar_action`

## Nodes

1. **Normalize Envelope** — guarantees stable fields
2. **Redis Chat Memory** — session-scoped conversation history
3. **Attachment Router** — routes audio/image/document/none
4. **Audio Pipeline** — download + Whisper transcription
5. **Image/Document Processors** — extract context
6. **Fetch KB Context (Postgres)** — HTTP call to the hybrid KB Search v2 webhook (`/webhook/kb/search`)
7. **Apply KB Context** — injects KB excerpts into the agent prompt
8. **AI Agent** — Gemini via OpenRouter with Composio MCP tools
9. **Twenty CRM Subworkflow** — creates or updates lead record
10. **Parse Agent Output** — extracts structured metadata from JSON block
11. **Build Response** — emits canonical output

## Architecture changes (2026-05-12)

- **Removed:** broken `Postgres PGVector Store` + `Embeddings Google Gemini` retrieve-as-tool (dimension mismatch: Gemini 768-dim vs pgvector 1536-dim).
- **Added:** new `Postgres PGVector Store` + `Embeddings OpenAI` retrieve-as-tool (text-embedding-3-small, 1536-dim, matched to pgvector column). The AI Agent now has direct vector search access to `cs_knowledge_chunks`.
- **Retrieval (dual):**
  1. **Direct tool** — `Postgres PGVector Store` retrieve-as-tool for agent-driven semantic search
  2. **Webhook fallback** — `Customer Service KB Search v2` hybrid webhook (OpenAI 1536-dim + pgvector cosine + Postgres tsvector BM25 fused via RRF) for pre-fetching context
- **Prompt:** system prompt now anchors the five LEV product names (Agentyx, Contax, Acumatica, Oosto/Metropolis, Legalink) and includes a strict grounding rule: if KB context is empty or missing the asked product, respond explicitly "no encuentro información indexada sobre X, lo escalo" instead of hallucinating.

## Related workflows

- `customer-service-kb-search` — hybrid retrieval webhook (`/webhook/kb/search`)
- `customer-service-kb-sync` — daily ingestion from Google Drive + static catalog stubs

## Environment variables

- `KB_SEARCH_WEBHOOK_URL` — URL of the KB Search v2 webhook (default: `https://levinnovation.n8n.agentyx.one/webhook/kb/search`)
- `N8N_AUTH_TRUSTED_PROXY_SECRET` — auth secret for internal webhook calls
- `OPENROUTER_API_KEY` — for Gemini Flash via OpenRouter (AI Agent)
- `COMPOSIO_ENTITY_ID` — MCP entity identifier

## Audio transcription note

Audio messages are transcribed via OpenAI Whisper API before being processed by the Gemini AI Agent.
