# ADR-0030: Portal-Based Document Ingestion for RAG

## Status
Accepted

## Context
The existing Google Drive → n8n → Postgres ingestion pipeline for the Customer Service KB proved fragile:
- n8n 2.19.5 Google Drive v3 node has router/operation mapping bugs (`Cannot read properties of undefined (reading 'execute')`)
- Mixed file types (Google Docs, Sheets, PDFs, markdown) require different download/export endpoints
- OAuth token refresh and credential decryption are hard to debug end-to-end
- File organization in Drive (product folders → context subfolders) is implicit and error-prone

We needed a reliable, tenant-agnostic way for users to upload documents and have them automatically chunked, embedded, and stored in `cs_documents` / `cs_knowledge_chunks`.

## Decision
Add a **"Documentos" tab** to the Agentyx Client Portal that handles the entire ingestion pipeline synchronously:

1. **Upload** → drag-and-drop or file picker (PDF, DOCX, XLSX, TXT, MD, CSV)
2. **Extract** → server-side text extraction via format-specific libraries
3. **Chunk** → recursive character text splitter (1200 chars, 150 overlap)
4. **Embed** → OpenAI `text-embedding-3-small` API
5. **Store** → upsert into `cs_documents` + `cs_knowledge_chunks` in shared Railway Postgres

### Architecture

```
User drops file on Portal /documents
    ↓
POST /api/documents (Next.js API route)
    ↓
document-processor.ts  ←  pdf-parse / mammoth / xlsx
    ↓
kb-client.ts  →  raw PG queries to cs_documents / cs_knowledge_chunks
    ↓
OpenAI embeddings API
    ↓
Postgres (shared Railway DB)
    ↓
n8n AI Agent  →  Postgres PGVector Store tool  →  similarity search
```

### Multi-tenancy
- `tenant_slug` derived from request hostname (`levinnovation.portal.agentyx.one` → `levinnovation`)
- Added `tenant_slug` column to both `cs_documents` and `cs_knowledge_chunks`
- All portal queries scoped by `tenant_slug`
- n8n agent workflows can optionally filter by `tenant_slug` in metadata

### Files changed (portal repo: `levinnovation/agentyx-client-portal`)
| File | Purpose |
|------|---------|
| `src/app/(portal)/documents/page.tsx` | Document management UI |
| `src/app/api/documents/route.ts` | POST: upload + ingest |
| `src/app/api/documents/list/route.ts` | GET: list indexed docs |
| `src/components/documents/document-uploader.tsx` | Dropzone + product tag input |
| `src/components/documents/document-list.tsx` | Searchable document list |
| `src/lib/document-processor.ts` | Text extraction + chunking + hashing |
| `src/lib/kb-client.ts` | Raw PG client for KB tables |
| `src/components/agentyx/app-shell.tsx` | Add "Documentos" nav item |
| `src/middleware.ts` | Protect `/documents` route |

### Preserved features
- All external app links in sidebar remain unchanged (n8n, Flowise, Paperclip, LibreChat)
- Existing portal routes (dashboard, agents, activity, outputs, chat) untouched

## Consequences

### Positive
- **Reliable**: No dependency on n8n Google Drive node bugs
- **User-friendly**: One-click upload with immediate feedback
- **Multi-format**: Supports PDF, DOCX, XLSX, TXT, MD, CSV out of the box
- **Tenant-agnostic**: `tenant_slug` isolation allows reuse across all tenants
- **Synchronous**: User sees "Indexed! N chunks" immediately; no waiting for cron

### Negative
- **Synchronous blocking**: Large files (>5MB) or many chunks can hit Vercel/Railway timeout limits. Async queue (BullMQ / n8n webhook) can be added later.
- **No revision history**: Overwrites existing document with same `source_id`. Version counter increments, but old chunks are deleted.
- **OpenAI dependency**: Requires valid `OPENAI_API_KEY` in portal env.

## Migration
`003_add_tenant_slug.sql` adds `tenant_slug` to `cs_documents` and `cs_knowledge_chunks` with backfill for existing rows.

## Related
- ADR-0029 (Customer Service RAG rebuild)
- `knowledge/operations/customer-service-rag-runbook.md`
- `tenants/levinnovation/assets/deploy/railway/migrations/003_add_tenant_slug.sql`
