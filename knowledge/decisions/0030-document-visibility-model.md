# ADR-0030: Shareable vs Context-Only Document Visibility Model

**Status:** Accepted
**Date:** 2026-05-13

## Context

Every user-uploaded document in the Agentyx federation flows through the portal → agent proxy → n8n → (optionally) Composio MCP external tools. Today, all documents are treated identically:

1. **Portal uploads** a file → text is extracted → stored in Postgres KB → chunks are embedded.
2. **n8n customer-service-core** receives attachments as `attachments[]` → downloads the document → extracts text → **merges verbatim document text into the user prompt** as `[Documento adjunto]: ...`.
3. **Composio MCP tools** receive `x-user-prompt` header containing the enriched message — including the full document text.
4. There is **no distinction** between "the LLM may use this document to answer" vs "the system may attach/share this document with third parties."

This creates a data-exposure risk: a context-only document (e.g., internal pricing sheet, client's confidential analysis) could be attached to an email, forwarded via Gmail, or synced to Google Drive through Composio tools if the model decides to do so.

## Decision

We introduce an explicit **`document_visibility`** attribute at every boundary where documents cross system contexts:

### 1. Enum: `document_visibility`

| Value | Meaning | LLM Context | File Attach | Email Forward | Signed Link |
|-------|---------|:---:|:---:|:---:|:---:|
| `context_only` | LLM may read; never attach/share externally | ✅ | ❌ | ❌ | ❌ |
| `shareable` | May attach, email, or generate signed links | ✅ | ✅ | ✅ | ✅ |

Default: `context_only`.

### 2. Storage: Railway Bucket + Postgres Metadata

- **Blobs** stored in Railway Bucket (or S3-compatible object store).
- **Metadata** in Postgres `user_documents` table (`003_document_visibility.sql` migration).
- Existing KB documents (`cs_documents`) get a nullable `visibility` column defaulting to `context_only`.

### 3. API Envelope: Portal → Agent → n8n

Messages carry `attachments[]` with per-item `document_visibility`. A new `user_documents[]` field lists all user docs at conversation start. Only `shareable` items include `signed_url`.

### 4. Portal Upload UI

Upload dialog gains a visibility toggle (default `context_only`). The selected visibility is persisted when the document is indexed.

### 5. Agent Proxy

The portal agent proxy (`/api/agent/[...path]/route.ts`) strips `signed_url` from `context_only` attachments before forwarding to the agent service.

### 6. n8n Workflow Guardrails

The `customer-service-core` workflow is updated to:
- Carry `document_visibility` through the envelope.
- Before MCP tool calls, filter attachments: only `shareable` items get signed URLs; `context_only` items get only the excerpt.
- System prompt includes a hard rule: "never attach or email `context_only` documents."

### 7. Composio MCP Transport

The `x-shareable-documents` header carries only `shareable` document references. The `x-user-prompt` header must NOT contain full document text from `context_only` items.

## Consequences

### Positive

- Clear data-boundary enforcement at every system edge.
- Users can explicitly decide which documents are safe to share.
- No breaking changes to existing document upload flow (default is `context_only`, which is the current behavior).
- Railway Bucket avoids storing large blobs in app tables.

### Trade-offs

- Requires a Prisma migration and new `user_documents` table in the portal.
- Upload UI complexity increases slightly (visibility radio/picker).
- n8n workflow has additional Code nodes for filtering.

## Implementation Plan

1. **contract**: Define `document_visibility` enum + API envelope spec (this repo, `tenants/.../contracts/`).
2. **storage**: Add `003_document_visibility.sql` migration.
3. **portal**: Add visibility to upload UI (`document-uploader.tsx`), list API, and agent proxy.
4. **n8n**: Update `customer-service-core.json` — Normalize Envelope, system prompt, tool guardrails.
5. **template**: Sync portal template under `templates/forks/agentyx-client-portal/`.
6. **knowledge**: This ADR + runbook for applying the migration.

## Rejected Alternatives

1. **Prompt-only enforcement**: Trusting the model to never share `context_only` docs is insufficient — models can be manipulated or misread visibility metadata.
2. **Single Postgres BYTEA table**: Storing blob bytes in app tables is operationally heavier and contradicts the "no giant tables" constraint.
3. **No visibility at all (status quo)**: Works for current use cases but creates data-exposure risk as the platform scales to more tenants and Composio integrations.
