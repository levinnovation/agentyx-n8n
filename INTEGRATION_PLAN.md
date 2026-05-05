# Integration Plan: n8n MCP + LibreChat Hardening

## 1. LibreChat Hardening

### Current State
- LibreChat supports custom endpoints via `librechat.yaml`
- API keys can be preset via env vars (`apiKey: '${ENV_VAR}'`)
- Backend resolves keys; frontend only sees `userProvide: false`
- **Vulnerability**: Admin UI and error responses might expose raw config

### Changes Needed

#### A. Backend: Mask preset keys in all API responses
**Files to modify:**
- `packages/api/src/endpoints/custom/config.ts` — already strips keys, verify no leaks
- `api/server/routes/config.js` — ensure no raw config exposure
- Add middleware to scrub `apiKey` fields from any JSON responses

#### B. Frontend: Hide key input fields for preset endpoints  
**Files to modify:**
- `client/src/components/Input/SetKeyDialog/CustomEndpoint.tsx` — skip key input when `userProvide: false`
- `client/src/components/Input/SetKeyDialog/SetKeyDialog.tsx` — show "Admin configured" badge instead of input

#### C. Config: Add OpenRouter preset endpoint
**Files to create/modify:**
- `librechat.yaml` in fork repo — add OpenRouter custom endpoint
- Railway env vars — add `OPENROUTER_API_KEY`

#### D. Database: Operational data migration
- Preset system prompts, default agents, or tenant-specific config
- PostgreSQL migrations if schema changes needed

---

## 2. n8n MCP Integration

### Phase 1: Local IDE Setup (Immediate)
- Add `.cursor/mcp.json` template for Cursor IDE
- Add `.claude/CLAUDE.md` instructions for Claude Code
- Configure `n8n-mcp` (npx or Docker) pointing to Railway n8n instance

### Phase 2: Git-First Workflow Authoring
- AI generates workflow JSON via MCP
- Saves to `tenants/{tenant}/assets/workflows/n8n/{name}.json`
- `make validate` checks JSON shape
- CI imports to dev n8n → test → merge → prod deploy

### Phase 3: Shared Railway Service (Optional)
- Add `[n8n-mcp]` service to `railway.toml`
- HTTP mode (SSE transport) for team access
- Points to internal n8n URL

---

## Implementation Order
1. ✅ Fix Railway deploys (n8n, paperclip) — IN PROGRESS
2. LibreChat preset keys + UI hardening
3. n8n MCP local IDE configs
4. n8n MCP knowledge docs + ADR
5. Test all services
6. Final commits + push
