# Customer Service Core (Levinnovation)

Reusable sub-workflow for multi-channel customer service adapters.

## Input envelope

Provide one item with:

- `channel` — e.g. `kapso-wa`, `telegram`, `meta-comment`
- `conversation_id` — unique session ID
- `user_id` — sender identifier
- `message` — text content
- `attachments` — array of `{ type, url, mime_type }`
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
6. **Knowledge Base Loader** — loads `customer-service-knowledge.md` into vector store
7. **Vector Store Upsert + Retriever** — in-memory RAG for the AI Agent
8. **AI Agent** — Gemini via OpenRouter with Composio MCP tools
9. **Parse Agent Output** — extracts structured metadata from JSON block
10. **Twenty CRM Search/Upsert** — creates or updates lead record
11. **Audit Log** — logs interaction to workflow static data
12. **Build Response** — emits canonical output

## Environment variables

See `.env.example`.

## Audio transcription note

Audio messages are transcribed via OpenAI Whisper API (one lightweight HTTP call)
before being processed by the Gemini AI Agent. This is the most reliable pattern
in n8n today. The main reasoning and response generation still uses Gemini.
