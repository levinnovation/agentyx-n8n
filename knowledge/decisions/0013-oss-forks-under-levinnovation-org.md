# ADR-0013: OSS Forks Under `levinnovation/` as Canonical Image Sources

**Status:** Accepted  
**Date:** 2026-05-04

## Context

ADR-0010 introduced Railway as the canonical deployment platform. ADR-0012 added Better Auth as the per-tenant auth federation layer. Both ADRs reference upstream images (`n8nio/n8n`, `ghcr.io/danny-avila/librechat`, etc.) directly. For deep integration — user-store migration, custom auth middleware, and tenant-specific patches — we need our own fork of each OSS app under the `levinnovation/` GitHub org.

## Decision

1. **Every OSS service in the Railway tenant stack builds from a `levinnovation/agentyx-*` fork**, not directly from upstream images.
2. **Phase 1 (dev):** Railway services deploy from the fork repo's `agentyx/main` branch via Railway GitHub source.
3. **Phase 2 (stable):** Images publish to `ghcr.io/levinnovation/agentyx-*`; `railway.toml` flips from repo source to GHCR image.
4. **Branching convention:**
   - `main` = pure upstream mirror. No agentyx commits.
   - `agentyx/main` = integration branch with all patches, Dockerfile, CI.
   - Feature branches branch from `agentyx/main`.
5. **Fork registry:** `templates/assets/railway-tenant-stack/forks.yaml` is the single source of truth.

## Forks

| Name | Upstream | Status |
|------|----------|--------|
| `agentyx-auth-service` | New (scaffolded) | Active |
| `agentyx-client-portal` | New (scaffolded) | Active |
| `agentyx-librechat` | `danny-avila/LibreChat` | To create |
| `agentyx-flowise` | `FlowiseAI/Flowise` | To create |
| `agentyx-paperclip` | `paperclipai/paperclip` | To create |
| `agentyx-n8n` | `n8n-io/n8n` | Exists; baseline-sync |
| `open-webui` | `open-webui/open-webui` | Archive |

## Image vs repo deploy matrix

| Service | Phase 1 | Phase 2 |
|---------|---------|---------|
| `auth-service` | Repo | GHCR |
| `client-portal` | Repo | GHCR |
| `librechat` | Repo | GHCR |
| `flowise` | Repo | GHCR (license-permitting) |
| `paperclip` | Repo | GHCR |
| `n8n` | Upstream image | Upstream image |
| `langfuse` | Upstream image | Upstream image |

## Consequences

### Positive

- Full control over auth integration patches.
- Can pin to tested upstream tags while carrying our patches.
- Image builds are reproducible and versioned.

### Negative

- Ongoing rebase toil when upstream releases new versions.
- Flowise license (NOASSERTION) may block redistribution.

## Rejected alternatives

- **Deploy directly from upstream** — rejected because it prevents deep auth integration.
- **Submodules / vendoring** — rejected because it complicates CI and upstream sync.

## Follow-up

- Run `bootstrap-fork.sh` for each missing repo.
- After 7 days of stable smoke tests, promote repo-deploy services to GHCR images.
- Archive `levinnovation/open-webui`.
