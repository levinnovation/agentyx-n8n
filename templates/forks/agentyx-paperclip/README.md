# Agentyx Paperclip

Fork of [paperclipai/paperclip](https://github.com/paperclipai/paperclip) with Better Auth canonical user-store integration.

## Branching

- `main` — pure upstream mirror
- `agentyx/main` — integration branch with patches
- Feature branches from `agentyx/main`

## Integration

### User store migration (ADR-0014)

Replace built-in auth with `@better-auth/client` server SDK:
- Map Paperclip's per-company isolation onto Better Auth `organization`.
- Patches in its Express server.

### Files to patch

- `src/server.ts` (Express auth middleware)
- `src/models/User.ts`

## Deploy

Railway tracks `agentyx/main` (Phase 1) or GHCR image (Phase 2).

## Env

See `services/paperclip/.env.example` in the monorepo.
