# ADR-0017: Centralized SSO Gateway with Custom Domains for Multi-Client Stack

**Status:** Accepted
**Date:** 2026-05-04
**Project:** `client-demo-agentyx` (`7d70063b-f1b4-415f-b57a-627d24ba0225`)

## Context

An audit of the `client-demo-agentyx` Railway project revealed critical auth and routing issues:

1. **No true SSO:** Each backend (Flowise, n8n, Paperclip, LibreChat) has its own auth system. Users must log in 4-6 times.
2. **Cookie domain mismatch:** `COOKIE_DOMAIN=.agentyx.app` does not cover `agentyx.one`, breaking session sharing between `demo-auth.agentyx.app` and `agentyx.one`.
3. **Gateway points to public URLs:** `BACKEND_*` variables use `*.up.railway.app` instead of private `*.railway.internal` networking.
4. **n8n database misconfiguration:** `DATABASE_URL` points to the `flowise` database instead of `n8n`.
5. **Backends publicly exposed:** Flowise, n8n, Paperclip, and LibreChat have Public Networking enabled, bypassing the auth gateway entirely.
6. **No custom domains for backends:** Only `demo-auth.agentyx.app` and `agentyx.one` exist. Flowise, n8n, Paperclip, and LibreChat lack custom domains, making gateway routing impossible.
7. **No RAG API:** LibreChat has no RAG/vector service despite `librechat_rag` database existing in Postgres.

We need a unified SSO architecture where a single login on `<slug>.portal.agentyx.one` creates a shared cookie under `.agentyx.one`, and all backend traffic flows through the auth gateway.

## Decision

### Phase 0 — Immediate Fixes (before any migration)

1. **Fix n8n database URL**
   - Remove or correct `DATABASE_URL` so n8n connects to the `n8n` database, not `flowise`.
   - Keep `DB_POSTGRESDB_*` variables as the authoritative config.

2. **Fix auth gateway backend URLs**
   - Change all `BACKEND_*` variables to use Railway private networking:
     - `BACKEND_FLOWISE=http://agx-demo-flowise.railway.internal:3000`
     - `BACKEND_N8N=http://agx-demo-n8n.railway.internal:5678`
     - `BACKEND_PAPERCLIP=http://agx-demo-paperclip.railway.internal:3100`
     - `BACKEND_LIBRECHAT=http://agx-demo-librechat.railway.internal:3080`

3. **Fix cookie domain**
   - Change `COOKIE_DOMAIN` from `.agentyx.app` to `.agentyx.one`.
   - Update `BETTER_AUTH_TRUSTED_ORIGINS` to include all `*.agentyx.one` subdomains.

### Phase 1 — SSO Gateway + Custom Domains

4. **Dynamic gateway configuration**
   - Modify `agentyx-auth-service` gateway to build `protectedHosts` and `BACKENDS` dynamically from env vars using `CLIENT_SLUG`:
     ```
     const slug = process.env.CLIENT_SLUG || 'demo';
     const BACKENDS = {
       [`${slug}.flowise.agentyx.one`]: process.env.BACKEND_FLOWISE,
       [`${slug}.n8n.agentyx.one`]: process.env.BACKEND_N8N,
       [`${slug}.paperclip.agentyx.one`]: process.env.BACKEND_PAPERCLIP,
       [`${slug}.chat.agentyx.one`]: process.env.BACKEND_LIBRECHAT,
     };
     ```

5. **Custom domains per backend**
   - Add custom domains in Railway for each backend service:
     - `demo.flowise.agentyx.one` → `agx-demo-flowise`
     - `demo.n8n.agentyx.one` → `agx-demo-n8n`
     - `demo.paperclip.agentyx.one` → `agx-demo-paperclip`
     - `demo.chat.agentyx.one` → `agx-demo-librechat`
   - Keep existing `demo-auth.agentyx.app` and `agentyx.one` during transition; migrate to `demo.auth.agentyx.one` and `demo.portal.agentyx.one` in a follow-up.

6. **Disable Public Networking on backends**
   - After custom domains are verified and DNS propagates, disable Public Networking on:
     - `agx-demo-flowise`
     - `agx-demo-n8n`
     - `agx-demo-paperclip`
     - `agx-demo-librechat`
   - This forces all traffic through `agx-demo-auth` (gateway).

### Phase 2 — Paperclip Trusted Proxy Mode

7. **Implement trusted proxy mode in Paperclip**
   - Add `PAPERCLIP_AUTH_TRUSTED_PROXY=true`.
   - Modify `actorMiddleware` to read `X-Auth-User-*` headers injected by the gateway and upsert a shadow user into the local `authUsers` table (required for FK constraints).
   - Decision: **Keep local Better Auth as fallback** for debugging, but default to trusted proxy when headers are present.

### Phase 3 — RAG API for LibreChat

8. **Deploy RAG API service**
   - Add `agx-demo-rag-api` service using image `registry.librechat.ai/danny-avila/librechat-rag-api-dev-lite:latest`.
   - Point to existing `librechat_rag` Postgres database (pgvector already installed).
   - Configure LibreChat env vars: `RAG_API_URL=http://agx-demo-rag-api.railway.internal:8000`.
   - Decision: **Use OpenAI `text-embedding-3-small`** for embeddings provider (simplest, well-supported).

### Phase 4 — Multi-Client Onboarding

9. **Per-client Railway project**
   - Each new client gets a separate Railway project (`agentyx-<slug>-prod`) for maximum isolation.
   - A bootstrap script creates the project, deploys Postgres, bootstraps 6 logical DBs, deploys MongoDB, Meilisearch, and all services, then configures custom domains and env vars.

## Consequences

### Positive

- Single login across all backend services.
- Shared `.agentyx.one` cookie enables true SSO.
- Backends are no longer directly exposed to the internet.
- Dynamic gateway config allows instant per-client onboarding.
- RAG API unlocks vector search for LibreChat.

### Negative

- Disabling Public Networking is a breaking change if custom domains fail or DNS is slow.
- Paperclip trusted proxy mode requires careful shadow-user sync to avoid FK violations.
- Each client project increases Railway cost (separate Postgres, MongoDB, etc.).
- Migration from `demo-auth.agentyx.app` to `demo.auth.agentyx.one` requires DNS cutover.

## Rejected alternatives

- **Shared Railway environment per client:** Railway environments share physical infra; insufficient isolation for multi-tenant SaaS.
- **Ollama for embeddings:** Cheaper but requires an additional Ollama service; adds operational complexity.
- **Disable Paperclip local auth completely:** Rejected in favor of fallback mode for debugging.

## Follow-up

- Verify all custom domains resolve and serve traffic before disabling Public Networking.
- Add health-check smoke tests after each phase.
- Document the per-client bootstrap script in `knowledge/operations/`.
- ADR-0018 will cover Paperclip trusted proxy implementation details.
- ADR-0019 will cover the RAG API integration.
