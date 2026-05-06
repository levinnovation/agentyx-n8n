# Railway Template Sources

## Internal LEV Innovation template (canonical)

The `client-demo-agentyx` project is saved as a **private Railway template** inside the `levinnovation` workspace. This is the canonical one-click deploy source for all new tenants.

- **Template docs:** [`railway-internal-template.md`](railway-internal-template.md)
- **Template config:** `templates/assets/railway-tenant-stack/template-config.json`
- **Post-deploy script:** `scripts/railway/configure-tenant-post-deploy.sh`
- **Visibility:** Private (unpublished)
- **Workspace:** `levinnovation`
- **Source project:** [`client-demo-agentyx`](https://railway.com/project/7d70063b-f1b4-415f-b57a-627d24ba0225/)

**Services in the internal template:** Postgres, MongoDB, meilisearch, better-auth, auth-proxy, n8n, librechat, portal, paperclip, flowise.

## External templates (reference only)

These public Railway templates are used as **env-default scaffolding reference**, never as deploy source. The canonical deploy source is the internal LEV Innovation template or the `levinnovation/agentyx-*` fork + this repo's `railway.toml`.

| Service | Railway template | Notes |
|---------|-----------------|-------|
| Postgres | [railway.com/deploy?template=postgres](https://railway.com/deploy?template=postgres) | Railway plugin; no Dockerfile |
| n8n | [railway.com/deploy?template=n8n](https://railway.com/deploy?template=n8n) | Upstream image; no fork needed for runtime |
| LibreChat | [railway.com/deploy?template=librechat](https://railway.com/deploy?template=librechat) | Env defaults reference; deploy from `agentyx-librechat` fork |
| Langfuse | [railway.com/deploy?template=langfuse](https://railway.com/deploy?template=langfuse) | Upstream image; OIDC config via env vars |
| Flowise | [railway.com/deploy?template=flowise](https://railway.com/deploy?template=flowise) | Env defaults reference; deploy from `agentyx-flowise` fork |

## Custom services (no public template)

- `better-auth` — built from `levinnovation/agentyx-vertical-assets/services/better-auth`
- `auth-proxy` — Caddyfile-only; lives in this repo
- `client-portal` — built from `levinnovation/agentyx-client-portal`
- `paperclip` — built from fork `levinnovation/agentyx-paperclip`
- `agent` — per-tenant GHCR image; built by `_reusable/build-agent-image.yml`
