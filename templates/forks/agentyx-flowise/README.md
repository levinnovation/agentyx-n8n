# Agentyx Flowise

Fork of [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise) with Better Auth canonical user-store integration.

## License warning

Flowise is **NOASSERTION**. Verify redistribution terms before publishing GHCR image. If blocked, keep Flowise behind forward-auth (ADR-0012) and skip user-store migration.

## Branching

- `main` — pure upstream mirror
- `agentyx/main` — integration branch with patches
- Feature branches from `agentyx/main`

## Integration

### User store migration (ADR-0014)

Patch `packages/server/src/utils/` Passport.js setup:
- Replace local `BasicStrategy` with `OAuth2Strategy` pointed at auth-service.
- Replace `User` repo lookups with auth-service HTTP calls.

### Files to patch

- `packages/server/src/utils/index.ts` (Passport setup)
- `packages/server/src/database/entities/User.ts`

## Deploy

Railway tracks `agentyx/main` (Phase 1) or GHCR image (Phase 2, license-permitting).

## Env

See `services/flowise/.env.example` in the monorepo.
