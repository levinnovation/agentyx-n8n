# ADR-0010: Per-tenant Railway project as canonical runtime

**Status:** Accepted  
**Date:** 2026-05-04  
**Supersedes:** ADR-0009

## Context

ADR-0009 established a self-hosted n8n CE runtime on a Hostinger VPS. While functional, it requires manual SSH operations, lacks integrated observability, and couples the n8n runtime with a single physical server. As the tenant stack grows to include LibreChat (chat UI), Paperclip (AI-team orchestrator), Langfuse (LLM tracing), Flowise (optional low-code agents), and an Agentyx Portal, a unified, API-driven, per-tenant deployment platform is needed.

## Decision

1. **Adopt Railway as the canonical deployment platform** for every tenant stack.
2. **One Railway project per tenant**. Inside each project, the following services run:
   - `postgres` — Railway Postgres plugin (multi-DB: n8n, langfuse, librechat, paperclip)
   - `n8n` — n8n Community Edition (`n8nio/n8n`)
   - `librechat` — LibreChat (`ghcr.io/danny-avila/librechat`)
   - `paperclip` — Paperclip AI orchestrator (built from `paperclipai/paperclip`)
   - `langfuse` — Langfuse tracing (`ghcr.io/langfuse/langfuse`)
   - `agent` — FastAPI / LangGraph agent image (per-tenant, per-capability)
   - `agentyx-portal` — Tenant portal SPA (TBD image)
   - `flowise` — Optional (`flowiseai/flowise`), off by default via `FLOWISE_ENABLED`
3. **Hostinger assets are deprecated, not deleted**. They remain in-repo as legacy reference and emergency rollback.
4. **All Railway operations go through the Railway CLI**. No GraphQL hand-rolling, no UI clicks for repeatable steps. CI and local operators use the same `scripts/railway/` toolkit.
5. **Agent images are built by existing `_reusable/build-agent-image.yml`** and deployed to Railway via `railway redeploy` after updating the service variable `AGENT_IMAGE`.

## Consequences

### Positive

- Single command (`bootstrap-tenant-railway.yml`) provisions a full tenant stack.
- Every service is independently redeployable via Git push.
- Railway private networking lets services talk internally without public exposure.
- Rollback is one CLI invocation (`scripts/railway/rollback.sh`).

### Negative

- Railway plan must support 7–8 services per tenant.
- `RAILWAY_TOKEN` must be project-scoped (preferred) or account-scoped with care.
- Paperclip has no official published image today; we build from upstream at a pinned commit.
- Agentyx Portal image is a placeholder until the SPA is built.

## Rejected alternatives

- **Keep Hostinger as primary** — rejected because it does not scale to a multi-service stack and requires manual SSH.
- **Use Render / Fly / Cloud Run as primary** — rejected to consolidate on one platform per tenant for simplicity; these remain as alternative scaffolds.
- **One shared Railway project for all tenants** — rejected to maintain tenant isolation and allow per-tenant scaling.

## Follow-up

- Populate `EUROMOBILIA_RAILWAY_PROJECT_ID` GitHub variable after bootstrap.
- Build and push the Agentyx Portal image when the SPA is ready.
- Monitor Railway CLI flag changes; `_lib.sh` is the single place to pin around them.
