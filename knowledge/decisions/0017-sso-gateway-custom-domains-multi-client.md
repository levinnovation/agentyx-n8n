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

### Phase 0 — Immediate Fixes (completed ✅)

1. **Fix n8n database URL**
   - Removed incorrect `DATABASE_URL` from n8n. `DB_POSTGRESDB_*` variables are authoritative.

2. **Fix auth gateway backend URLs**
   - Changed all `BACKEND_*` variables to use Railway private networking:
     - `BACKEND_FLOWISE=http://agx-demo-flowise.railway.internal:3000`
     - `BACKEND_N8N=http://agx-demo-n8n.railway.internal:5678`
     - `BACKEND_PAPERCLIP=http://agx-demo-paperclip.railway.internal:3100`
     - `BACKEND_LIBRECHAT=http://agx-demo-librechat.railway.internal:3080`

3. **Fix cookie domain**
   - Changed `COOKIE_DOMAIN` from `.agentyx.app` to `.agentyx.one`.
   - Updated `BETTER_AUTH_TRUSTED_ORIGINS` to include all `*.agentyx.one` subdomains.

### Phase 1 — SSO Gateway + Custom Domains (completed ✅)

4. **Dynamic gateway configuration**
   - Auth service builds `protectedHosts` and `BACKENDS` dynamically from `CLIENT_SLUG` env var.

5. **Custom domains per backend**
   - Added custom domains for all backends:
     - `demo.flowise.agentyx.one`, `demo.n8n.agentyx.one`, `demo.paperclip.agentyx.one`, `demo.chat.agentyx.one`
   - Added canonical domains: `demo.auth.agentyx.one`, `demo.portal.agentyx.one`.

6. **Switch to fork repos via Railway GitHub App**
   - All custom services (auth, portal, n8n, flowise, paperclip, librechat) now deploy from `levinnovation/*` fork repos connected via Railway GitHub App.
   - Official images used only for: Langfuse, RAG API.

7. **Disable Public Networking on backends**
   - Manual step: disable Public Networking on Flowise, n8n, Paperclip, LibreChat via Railway dashboard after domain verification.

### Phase 2 — Paperclip Trusted Proxy Mode (completed ✅)

8. **Implement trusted proxy mode in Paperclip**
   - Added `PAPERCLIP_AUTH_TRUSTED_PROXY=true` and `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET`.
   - `actorMiddleware` reads `X-Auth-User-*` headers and upserts shadow user into `authUsers` via `ensureLocalUser()`.
   - **Local Better Auth kept as fallback** for debugging.

### Phase 3 — RAG API for LibreChat (completed ✅)

9. **Deploy RAG API service**
   - Created `agx-demo-rag-api` service with image `registry.librechat.ai/danny-avila/librechat-rag-api-dev-lite:latest`.
   - Configured `librechat_rag` Postgres DB, OpenAI embeddings.
   - LibreChat `RAG_API_URL` points to internal RAG service.

### Phase 4 — Multi-Client Onboarding (script created ✅)

10. **Per-client Railway project bootstrap script**
    - `scripts/railway/bootstrap-client-project.sh` automates:
      - Project creation
      - Service creation (auth, portal, n8n, flowise, paperclip, librechat, rag-api, langfuse)
      - Fork repo connection via Railway GitHub App
      - Custom domain registration
      - Environment variable provisioning
      - Service deployment
    - Manual steps remaining: add Postgres/MongoDB plugins, run migrations, set secrets.

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
