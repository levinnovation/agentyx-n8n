# Agentyx LibreChat

Fork of [danny-avila/LibreChat](https://github.com/danny-avila/LibreChat) with Better Auth canonical user-store integration.

## Branching

- `main` — pure upstream mirror
- `agentyx/main` — integration branch with patches
- Feature branches from `agentyx/main`

## Integration

### User store migration (ADR-0014)

Patch `api/server/services/AuthService.js` and the `User` Mongoose model loader:
- Replace local lookups with HTTP fetch to `auth-service` `/api/users/:sub`.
- Keep a thin `userShadow` Mongo collection (sub-keyed) for app-specific fields.
- Use existing `OPENID_*` env vars wired to auth-service.

### Files to patch

- `api/server/services/AuthService.js`
- `api/models/schema/user.js`
- `api/server/routes/config.js` (OIDC config)

## Deploy

Railway tracks `agentyx/main` (Phase 1) or GHCR image (Phase 2).

## Env

See `services/librechat/.env.example` in the monorepo.
