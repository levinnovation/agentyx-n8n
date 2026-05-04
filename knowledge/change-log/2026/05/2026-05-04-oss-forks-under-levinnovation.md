# Change Record: OSS Forks Under levinnovation

**Date:** 2026-05-04  
**Scope:** Fork bootstrap tooling, `forks.yaml` registry, ADR-0013, auth-service and client-portal scaffolds

## Summary

Established `levinnovation/agentyx-*` forks as canonical sources for all OSS services in the Railway tenant stack. Added bootstrap scripts, fork registry, and scaffolds for auth-service and client-portal.

## What changed

- **ADR-0013** — New decision: forks under `levinnovation/`, branch convention, deploy matrix.
- **Fork registry** — `templates/assets/railway-tenant-stack/forks.yaml`.
- **Bootstrap scripts** — `scripts/forks/bootstrap-fork.sh`, `sync-upstream.sh`, `rebase-agentyx.sh`.
- **Make targets** — `scaffold-fork`, `sync-fork`, `rebase-agentyx`, `build-forks`, `connect-railway-scratch`.
- **Scaffolds** — Auth service (Node 20 + TS + Fastify + Better Auth) and client portal (Next.js 14 + Tailwind + shadcn/ui) content prepared for external repos.
- **CI workflows** — `_reusable/build-fork-image.yml` and per-fork wrappers.
- **Ops docs** — `how-to-rotate-railway-token.md`, `railway-template-sources.md`.

## Validation

- `make validate` passes.
- `make knowledge-index` regenerated.

## Related

- ADR-0013
- ADR-0012
