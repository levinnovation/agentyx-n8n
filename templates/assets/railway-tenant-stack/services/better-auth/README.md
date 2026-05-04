# Better Auth

Per-tenant auth federation service.

## Role

- Better Auth core (sessions, sign-in, sign-out, social, email/password).
- OIDC provider plugin (LibreChat and Langfuse federate as OIDC RPs).
- `/api/auth/forward-auth` endpoint for Caddy `forward_auth` gating.
- `/.well-known/openid-configuration` + `/oauth2/*` OIDC IDP endpoints.
- `/jwks.json` public JWKS for Agent FastAPI JWT verification.

## Identity sources

- **Google Workspace OIDC** — primary for operators (`GOOGLE_HD` restricts to hosted domain).
- **Email + password** — fallback for tenant-facing users.

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/auth/*` | Better Auth core |
| `/api/auth/forward-auth` | Caddy forward-auth check |
| `/.well-known/openid-configuration` | OIDC discovery |
| `/oauth2/*` | OIDC protocol endpoints |
| `/jwks.json` | Public JWKS |

## Environment

See `.env.example` for required variables.
