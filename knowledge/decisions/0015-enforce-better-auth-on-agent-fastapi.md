# ADR-0015: Enforce Better Auth on Agent FastAPI

**Status:** Accepted  
**Date:** 2026-05-04

## Context

The Agent FastAPI service (`quotation-assistant`) exposes endpoints that may carry sensitive customer data. ADR-0012 introduced Better Auth env vars but left `AUTH_REQUIRED=false`. This ADR adds JWT verification and a per-route auth policy.

## Decision

1. **Add `app/auth.py`** to the LangGraph agent template and the euromobilia agent:
   - `BetterAuthJWTMiddleware` validates Bearer JWT via JWKS (`BETTER_AUTH_JWKS_URL`).
   - Caches JWKS for 10 minutes.
   - Checks `iss` (`BETTER_AUTH_ISSUER`) and `aud` (`BETTER_AUTH_AUDIENCE`).
2. **Per-route policy table in `app/main.py`**:
   - `/health` — public
   - `/webhooks/kapso/*` — HMAC signature only (existing Kapso validation)
   - `/internal/*` — `X-Internal-Api-Key` header (machine-to-machine from n8n)
   - `/api/v1/*` — Better Auth JWT required
3. **Default `AUTH_REQUIRED=false`** in this ADR; flip per-tenant after rollout validation.
4. **Dependency:** `python-jose[cryptography]` for JWT/JWKS verification.

## Consequences

### Positive

- Agent endpoints are protected by the same auth layer as the rest of the stack.
- Stateless JWT verification — no session cookies or DB lookups.

### Negative

- Adds a dependency and a network call (JWKS fetch) on first request per cache window.

## Follow-up

- Flip `AUTH_REQUIRED=true` on the euromobilia agent after smoke tests pass.
- Document the flip procedure in the runbook.
