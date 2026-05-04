# ADR-0014: Migrate App User Stores to Better Auth Canonical

**Status:** Accepted  
**Date:** 2026-05-04

## Context

Each forked app (LibreChat, Flowise, Paperclip) and Langfuse maintain their own user tables. This fragments identity, complicates off-boarding, and makes SSO inconsistent. ADR-0012 introduced Better Auth as the federation layer; this ADR makes Better Auth the **canonical user store**.

## Decision

1. **Better Auth is the single source of truth** for user identity.
2. Each app queries the auth-service `/api/users/:sub` endpoint for user data.
3. Apps may keep a **thin shadow table** keyed by Better Auth `sub` for app-specific fields (preferences, conversation ownership).
4. **n8n** is explicitly excluded from user-store migration in this ADR — it stays behind `auth-proxy` forward-auth.
5. **Flowise license risk:** Flowise is NOASSERTION. If redistribution is blocked, keep Flowise behind forward-auth and skip user-store migration.

## User API Contract (auth-service)

- `GET /api/users/:sub` → `{ id, email, name, image, organizationIds, roles, customClaims }`
- `GET /api/users?email=` → same shape
- `POST /api/users` (internal-only, SCIM)
- All gated by `X-Internal-Api-Key` header.

## Per-app integration

| App | Approach | Shadow table |
|-----|----------|-------------|
| LibreChat | Patch AuthService to fetch from auth-service | `userShadow` (Mongo) |
| Flowise | Patch Passport.js to OAuth2Strategy against auth-service | `User` (Postgres) — conditional on license |
| Paperclip | Replace built-in auth with `@better-auth/client` server SDK | `User` (Postgres) |
| Langfuse | No fork; Auth.js custom OIDC against auth-service | `users` (Postgres) — auto-populated on first sign-in |

## Consequences

### Positive

- One user record per person.
- Off-boarding is a single DELETE in Better Auth.
- Role changes propagate to all apps immediately.

### Negative

- Each app requires a patch; upstream rebase cost.
- Extra HTTP call on every user lookup (mitigated by caching).

## Follow-up

- Implement patches in each fork's `agentyx/main` branch.
- Document patch surface in each fork's `INTEGRATION.md`.
