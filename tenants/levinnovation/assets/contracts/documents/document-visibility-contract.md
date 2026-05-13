# Document Visibility Contract (v1)

## Purpose

Every user-uploaded document carries a **`document_visibility`** flag that controls how the AI agent (n8n / agent service / LibreChat) may use that document. The model alone cannot be trusted to enforce this — it must be enforced at **system boundaries**: the portal back-end, the agent proxy, the n8n subworkflow, and any tool that touches external systems.

---

## 1. Enum: `document_visibility`

| Value | Meaning | Prompt Injection | File Attach | Email Forward | Signed Link |
|-------|---------|:---:|:---:|:---:|:---:|
| `context_only` | LLM may read; never attach, never paste verbatim outside chat | ✅ | ❌ | ❌ | ❌ |
| `shareable` | May attach to replies, email, or generate signed/opaque links | ✅ | ✅ | ✅ | ✅ |

Default: `context_only`.

---

## 2. API Envelope: Portal → Agent → n8n

### When starting a conversation (portal → agent proxy → n8n)

```json
{
  "channel": "portal-web",
  "conversation_id": "conv_uuid",
  "user_id": "user_uuid",
  "message": "text content",
  "attachments": [
    {
      "id": "doc_uuid",
      "title": "filename.pdf",
      "mime_type": "application/pdf",
      "document_visibility": "context_only",
      "signed_url": null,
      "extracted_text_excerpt": "first 500 chars..."
    },
    {
      "id": "doc_uuid",
      "title": "report.pdf",
      "mime_type": "application/pdf",
      "document_visibility": "shareable",
      "signed_url": "https://bucket.railway.app/...?signature=...",
      "extracted_text_excerpt": "first 500 chars..."
    }
  ],
  "user_documents": [
    {
      "id": "doc_uuid",
      "title": "filename.pdf",
      "visibility": "context_only",
      "summary_or_excerpt": "text excerpt or empty"
    }
  ],
  "metadata": {
    "contact_name": "...",
    "phone": "...",
    "email": "..."
  }
}
```

### Key rules

1. **`attachments[]`** — sent only for the **current message** (inline). Each attachment carries `document_visibility` and optionally a `signed_url` (only for `shareable` items).
2. **`user_documents[]`** — sent once at conversation start (or on explicit request). Contains all documents the user has uploaded for this agent. Only `context_only` excerpt; `shareable` items include `signed_url`.
3. **`signed_url`** — short-lived (5 min default), generated server-side. Only present for `shareable` documents.
4. **`extracted_text_excerpt`** — first 500-2000 chars of extracted text, always present regardless of visibility. The LLM gets this in-context.

---

## 3. Postgres Schema

### `user_documents` table

```sql
CREATE TABLE IF NOT EXISTS public.user_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  tenant_id   text NOT NULL DEFAULT 'levinnovation',
  title       text NOT NULL,
  mime_type   text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes  bigint NOT NULL DEFAULT 0,
  visibility  document_visibility NOT NULL DEFAULT 'context_only',
  object_key  text NOT NULL,                          -- Railway Bucket or S3 key
  content_hash text,
  extracted_text text,
  extracted_text_truncated boolean DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_visibility ON public.user_documents(visibility);
```

---

## 4. Prompt rules for all agent runtimes

Insert this block into every agent system prompt that consumes user documents:

```
## POLÍTICA DE VISIBILIDAD DE DOCUMENTOS

Cada documento del usuario tiene una etiqueta de visibilidad:

- **context_only** (default): Puedes leerlo y usarlo para responder, pero NUNCA debes:
  - Adjuntarlo a un correo electrónico
  - Pegar su contenido textual en un mensaje saliente
  - Generar o compartir enlaces al documento
  - Reenviarlo a herramientas externas (Composio/Drive/etc.)

- **shareable**: Puedes adjuntarlo, enlazarlo, o compartirlo cuando el usuario lo solicite explícitamente.

Regla: Si un documento no tiene etiqueta de visibilidad, trátalo como context_only.
```

---

## 5. Tool guardrails

### n8n Code node filter (before any Composio tool call)

```javascript
// Pseudocode — implement in n8n Code node before MCP/Composio tools
const attachments = $input.first().json.attachments || [];
const shareableUrls = attachments
  .filter(a => a.document_visibility === 'shareable' && a.signed_url)
  .map(a => ({ title: a.title, url: a.signed_url }));
const contextOnlyExcerpts = attachments
  .filter(a => a.document_visibility === 'context_only')
  .map(a => ({ title: a.title, excerpt: a.extracted_text_excerpt }));
```

### Composio MCP guard

Pass only `shareable` document data in the `x-shareable-documents` header when calling external tools. The `x-user-prompt` header must NOT contain full document text for `context_only` items.

---

## 6. Version History

| Date | Version | Author | Notes |
|------|---------|--------|-------|
| 2026-05-13 | v1 | AI Infra | Initial contract |
