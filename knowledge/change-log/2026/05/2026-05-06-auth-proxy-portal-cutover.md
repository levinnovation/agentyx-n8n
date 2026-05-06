# Auth-Proxy-Portal Cutover Completed

**Date:** 2026-05-06  
**Affected:** `client-demo-agentyx` Railway project  
**ADR:** [ADR-0019](../decisions/0019-auth-proxy-portal-cutover-caddy-forward-auth.md)

## Summary

Completed the full cutover from the legacy `agx-demo-auth` monolith to the separated better-auth + auth-proxy + portal architecture.

## Changes Made

### `services/better-auth/`

- Enabled `advanced.crossSubDomainCookies` with `domain: "agentyx.one"` in `src/server.ts`.
- Added `useSecureCookies: true` for Railway TLS termination.
- Deployed to `demo.auth.agentyx.one`.

### `services/auth-proxy/`

- Added `auto_https off` to Caddyfile to prevent Let's Encrypt loops.
- Added explicit `http://` prefix to all site blocks (critical fix for Railway edge proxy).
- Replaced Caddy native `{$VAR}` expansion with shell-based `sed` substitution using `__VAR__` placeholders.
- Added `PORT=80` env var for Railway Docker routing.
- Added `:80` catch-all with `/health` endpoint.
- Deployed to `agx-demo-auth-proxy-production.up.railway.app`.

### Domain Cutover (via Railway GraphQL API)

| Domain | Old Service | New Service |
|--------|-------------|-------------|
| `demo.auth.agentyx.one` | `agx-demo-auth` | `agx-demo-better-auth` |
| `demo.n8n.agentyx.one` | `agx-demo-auth` | `agx-demo-auth-proxy` |
| `demo.flowise.agentyx.one` | `agx-demo-auth` | `agx-demo-auth-proxy` |
| `demo.paperclip.agentyx.one` | `agx-demo-auth` | `agx-demo-auth-proxy` |
| `demo.chat.agentyx.one` | `agx-demo-auth` | `agx-demo-auth-proxy` |

### Portal (`levinnovation/agentyx-client-portal`)

- Forced Dockerfile builder via `railway.toml`.
- Fixed missing `COPY scripts` in Dockerfile.
- Removed invalid `public` COPY.
- Hardcoded production app URLs in `app-shell.tsx`.
- Proxied auth requests to external better-auth service.

## Known Issues Resolved

1. **Caddy `{$VAR}` not expanding in Railway container** → Switched to shell-based substitution.
2. **Caddy hostname blocks not matching** → Added `http://` prefix.
3. **Auth-proxy 502** → Set `PORT=80` and disabled `auto_https`.
4. **Cross-subdomain session not shared** → Configured `crossSubDomainCookies.domain`.

## Verification

- `curl -b cookies.txt https://demo.n8n.agentyx.one/` returns n8n HTML when authenticated, 401 when not.
- Same behavior verified for Flowise, Paperclip, and LibreChat.
- Portal dashboard renders correctly for authenticated user.

## Remaining Tasks

- Set `OPENAI_API_KEY` on `agx-demo-rag-api`.
- Save stack as Railway template.
- Verify Paperclip trusted-proxy header handling.
