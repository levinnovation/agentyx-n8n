# Better Auth

Euromobilia auth federation service.

Identity sources:
- Google Workspace OIDC for operators
- Email + password fallback for tenant-facing users

Endpoints:
- `/api/auth/*` — Better Auth core
- `/api/auth/forward-auth` — Caddy forward-auth check
- `/.well-known/openid-configuration` — OIDC discovery
- `/jwks.json` — Public JWKS for Agent JWT verification
