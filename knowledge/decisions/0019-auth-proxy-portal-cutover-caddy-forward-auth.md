# ADR-0019: Auth-Proxy-Portal Cutover with Caddy forward_auth

**Status:** Accepted  
**Date:** 2026-05-06  
**Project:** `client-demo-agentyx` (`7d70063b-f1b4-415f-b57a-627d24ba0225`)

## Context

The `client-demo-agentyx` Railway project was running a legacy `agx-demo-auth` service that combined authentication, user management, and reverse-proxy responsibilities in a single monolithic container. This architecture had several problems:

1. **Tight coupling:** Auth logic and reverse-proxy logic were intertwined, making updates risky.
2. **No standard SSO federation:** Backends (n8n, Flowise, Paperclip, LibreChat) were either publicly exposed or proxied through a custom auth gateway that wasn't using standard protocols.
3. **Schema drift:** The legacy auth used snake_case columns (`user_id`) while Better Auth v1.6.9 expects camelCase (`userId`), blocking migration.
4. **Builder mismatch:** The portal service was stuck on Railpack builder despite Dockerfile configuration, causing build failures.
5. **Certificate loop:** Caddy inside the auth-proxy container was attempting Let's Encrypt challenges for domains not yet attached, causing crash-loops.

We needed to replace the legacy auth service with a clean separation of concerns:
- `agx-demo-better-auth` — Fastify + Better Auth v1.6.9 for OIDC/session management
- `agx-demo-auth-proxy` — Caddy with `forward_auth` for backend SSO gating
- `agx-demo-portal` — Next.js portal proxying auth to the external better-auth service

## Decision

### 1. Service separation

| Service | Responsibility | Tech |
|---------|---------------|------|
| `agx-demo-better-auth` | Authentication, sessions, OIDC, org plugin | Fastify + Better Auth v1.6.9 + PostgreSQL |
| `agx-demo-auth-proxy` | SSO gate for backends via `forward_auth` | Caddy 2 + shell-based env substitution |
| `agx-demo-portal` | User-facing portal with federated app links | Next.js + auth proxy to better-auth |

### 2. Schema regeneration

Generated a fresh Better Auth v1.6.9 schema via `npx @better-auth/cli generate` using camelCase columns. Manually added the custom `role` column that the generator omitted. Migrated user `vflores@levinnovation.com` into the new schema.

### 3. Portal build fixes

- **Forced Dockerfile builder:** Added `railway.toml` with `[build] builder = "DOCKERFILE"` because Railway API returned `builder: "RAILPACK"` despite dashboard UI showing Dockerfile.
- **Fixed missing `COPY scripts`:** The portal's `postinstall` hook runs `node scripts/patch-next-buildid.cjs`; added `COPY scripts ./scripts` to the Dockerfile `deps` stage.
- **Removed invalid `public` COPY:** `COPY --from=builder /app/public` failed because the directory only contained `.gitkeep`. Next.js standalone output already includes static assets.
- **Hardcoded app URLs:** Updated `src/components/agentyx/app-shell.tsx` to use hardcoded production URLs for federated services.
- **Auth proxy:** Replaced local Prisma auth handler in `src/app/api/auth/[...all]/route.ts` with a proxy to the external better-auth service.

### 4. Auth-proxy container fixes

- **`auto_https off`:** Railway terminates TLS at the edge; Caddy must not attempt Let's Encrypt.
- **Explicit `http://` prefix:** Caddy treats bare hostnames as HTTPS by default. With `auto_https off`, bare hostnames fail to match incoming HTTP requests. All site addresses must use `http://` (e.g., `http://demo.n8n.agentyx.one`).
- **Shell-based env substitution:** Caddy's native `{$VAR}` syntax did not expand in the Railway container environment. Replaced with `__VAR__` placeholders processed by an Alpine `sh` + `sed` entrypoint script.
- **`PORT=80`:** Railway Docker deployments route to the port specified by `$PORT`. Added `PORT=80` env var explicitly.
- **Health check:** Added `:80` catch-all with `/health` endpoint so Railway health checks pass.

### 5. Cross-subdomain cookies

Configured Better Auth with:

```typescript
advanced: {
  crossSubDomainCookies: {
    enabled: true,
    domain: "agentyx.one",
  },
  useSecureCookies: true,
}
```

This sets `Domain=agentyx.one` on the session cookie, making it available to `demo.n8n.agentyx.one`, `demo.flowise.agentyx.one`, etc.

### 6. Domain cutover (Phase 4)

Used Railway GraphQL API to atomically move custom domains:

| Domain | Moved from | Moved to |
|--------|-----------|----------|
| `demo.auth.agentyx.one` | `agx-demo-auth` (legacy) | `agx-demo-better-auth` |
| `demo.n8n.agentyx.one` | `agx-demo-auth` (legacy) | `agx-demo-auth-proxy` |
| `demo.flowise.agentyx.one` | `agx-demo-auth` (legacy) | `agx-demo-auth-proxy` |
| `demo.paperclip.agentyx.one` | `agx-demo-auth` (legacy) | `agx-demo-auth-proxy` |
| `demo.chat.agentyx.one` | `agx-demo-auth` (legacy) | `agx-demo-auth-proxy` |

## Consequences

### Positive

- Clean separation of auth, proxy, and portal concerns.
- Standard Better Auth v1.6.9 with organization plugin enables future multi-tenant features.
- Caddy `forward_auth` is a battle-tested pattern for SSO gating.
- Cross-subdomain cookies enable true single sign-on across all backend services.
- Domains are now managed via API, enabling automation for future tenant onboarding.

### Negative

- Brief downtime (~seconds) per domain during cutover.
- `forward_auth` adds one additional internal HTTP request per backend page load.
- Paperclip and LibreChat may need additional trusted-header configuration to recognize proxied users.
- Railway GraphQL API token permissions can expire; domain management may need manual fallback.

## Rejected alternatives

- **Keep legacy auth service:** Rejected due to tight coupling, schema drift, and lack of standard federation.
- **Use Nginx instead of Caddy:** Caddy's native `forward_auth` directive is simpler and requires less configuration than Nginx auth_request + Lua/subrequests.
- **Use OAuth2 Proxy:** Adds another dependency; Better Auth's built-in session + custom `/api/auth/forward-auth` endpoint is simpler for our stack.

## Follow-up

- Verify Paperclip's `PAPERCLIP_AUTH_TRUSTED_PROXY` settings work with the new `X-Auth-User` / `X-Auth-Email` headers from auth-proxy.
- Set `OPENAI_API_KEY` on RAG API service (`agx-demo-rag-api`).
- Save the working stack as a Railway template for per-client onboarding.
- Document the `http://` prefix requirement for Caddy behind TLS-terminating proxies in `knowledge/operations/`.
- Add smoke tests for `forward_auth` on all backend domains.
