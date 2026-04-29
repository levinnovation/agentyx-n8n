# Decisions

> Architectural Decision Records (ADRs) for this repository.

## ADR-001: Tenant-Domain-Capability-Asset Hierarchy

**Status:** Accepted
**Date:** 2026-04-29

**Context:** Previous agent repositories organized by tool type (`agents/`, `workflows/`, `tools/`). This made it impossible to answer "what business capability does this agent serve?" without reading code.

**Decision:** Organize everything by business domain. Agents and workflows are assets, not top-level categories.

**Consequences:**
- (+) Clear business mapping
- (+) Easy tenant isolation
- (-) Slightly deeper directory trees
- (-) Requires discipline to avoid tool-centric shortcuts

## ADR-002: YAML + JSON Schema for Specs

**Status:** Accepted
**Date:** 2026-04-29

**Context:** We need machine-readable specs that are also human-friendly.

**Decision:** Use YAML for all spec files with JSON Schema validation.

## ADR-003: Templates vs Tenants

**Status:** Accepted
**Date:** 2026-04-29

**Context:** Multiple tenants will need similar capabilities.

**Decision:** `templates/` holds reusable scaffolds with placeholder values. `tenants/` holds real instances. No tenant imports from another tenant.

## ADR-004: Makefile as Developer CLI

**Status:** Accepted
**Date:** 2026-04-29

**Context:** We want a simple, discoverable command interface.

**Decision:** `Makefile` is the primary developer CLI. Scripts in `scripts/` are invoked by Make targets.

## ADR-005: No Secrets in Git

**Status:** Accepted
**Date:** 2026-04-29

**Decision:** All secrets are referenced by name in deployment configs. Actual values are injected by CI/CD or local `.env`.

## ADR-006: Scaffolded, Not Production

**Status:** Accepted
**Date:** 2026-04-29

**Context:** This repo establishes structure and governance first.

**Decision:** All code assets (agents, workflows) are intentionally scaffolded with TODOs. Production logic is added in follow-up PRs with proper testing.
