# ADR-0004: Common utils as platform operator layer

**Status:** Accepted  
**Date:** 2026-04-29

## Context

Shared scripts and CLIs should not blur tenant boundaries or embed customer-specific rules.

## Decision

**Common platform utilities** live under `common/utils/` (when present). They are **operator-facing** and **parameterized** (tenant, domain, capability, paths). Tenant-specific business rules stay under `tenants/{tenant}/`.

## Consequences

### Positive

- Reusable tooling without coupling tenants
- Clear place for cross-cutting maintenance scripts

### Negative

- Requires discipline: no sneaking tenant logic into shared utils without parameters

## Rejected alternatives

- Copy-pasting the same script into every tenant folder

## Follow-up

- When `common/utils/` is introduced, add a context pack section and validate patterns in reviews
