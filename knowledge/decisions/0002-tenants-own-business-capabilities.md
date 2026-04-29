# ADR-0002: Tenants own business capabilities

**Status:** Accepted  
**Date:** 2026-04-29

## Context

Shared “global” business logic without clear ownership leads to coupling and unsafe cross-customer reuse.

## Decision

Each **tenant** owns its **domains** and **capabilities**. Customer-specific implementation lives under `tenants/{tenant}/`. Cross-tenant sharing uses **templates** and **standards**, not direct tenant-to-tenant references.

## Consequences

### Positive

- Explicit ownership and isolation
- Safer evolution per customer

### Negative

- Duplication may require template updates when patterns change

## Rejected alternatives

- Single shared `apps/` or monolithic customer layer at repo root

## Follow-up

- Document tenant onboarding in `knowledge/operations/` and context packs
