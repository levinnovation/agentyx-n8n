# Railway Template Sources

One-click Railway templates used as **env-default scaffolding reference**, never as deploy source. The canonical deploy source is the `levinnovation/agentyx-*` fork + this repo's `railway.toml`.

| Service | Railway template | Notes |
|---------|-----------------|-------|
| Postgres | [railway.com/deploy?template=postgres](https://railway.com/deploy?template=postgres) | Railway plugin; no Dockerfile |
| n8n | [railway.com/deploy?template=n8n](https://railway.com/deploy?template=n8n) | Upstream image; no fork needed for runtime |
| LibreChat | [railway.com/deploy?template=librechat](https://railway.com/deploy?template=librechat) | Env defaults reference; deploy from `agentyx-librechat` fork |
| Langfuse | [railway.com/deploy?template=langfuse](https://railway.com/deploy?template=langfuse) | Upstream image; OIDC config via env vars |
| Flowise | [railway.com/deploy?template=flowise](https://railway.com/deploy?template=flowise) | Env defaults reference; deploy from `agentyx-flowise` fork |

## Custom services (no template)

- `auth-service` — built from scratch in `levinnovation/agentyx-auth-service`
- `client-portal` — built from scratch in `levinnovation/agentyx-client-portal`
- `paperclip` — built from fork `levinnovation/agentyx-paperclip`
- `auth-proxy` — Caddyfile-only; lives in this repo
- `agent` — per-tenant GHCR image; built by `_reusable/build-agent-image.yml`
