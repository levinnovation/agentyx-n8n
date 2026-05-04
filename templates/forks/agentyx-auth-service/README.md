# Agentyx Auth Service

Per-tenant auth federation built on Better Auth + Fastify.

## Features

- Better Auth core (sessions, social, email/password)
- OAuth 2.1 Provider plugin
- Organization plugin
- Google Workspace OIDC
- Caddy `forward_auth` endpoint
- JWKS for Agent FastAPI JWT verification
- Internal user lookup API
- SCIM 2.0 (ADR-0016)

## Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `/api/auth/*` | Public | Better Auth core |
| `/api/auth/forward-auth` | Session cookie | Caddy forward-auth |
| `/jwks.json` | Public | JWKS for JWT verification |
| `/api/users/:sub` | `X-Internal-Api-Key` | Internal user lookup |
| `/api/scim/v2/*` | Bearer | SCIM 2.0 provisioning |

## Env

See `.env.example`.

## Deploy

Railway deploys from `agentyx/main` branch (Phase 1) or GHCR image (Phase 2).
