# Domain-Centric Policy

> All assets MUST be organized by tenant → domain → capability.

## Rules

1. No `agents/`, `workflows/`, or `tools/` directories at the repository root.
2. Every asset MUST have a `capability` field referencing a valid capability in the same tenant.
3. Cross-tenant asset references are FORBIDDEN.
4. Templates in `templates/` MUST use placeholder values (e.g., `{{tenant_id}}`).

## Enforcement

- `scripts/validate_specs.py` checks directory structure.
- CI fails if any asset lacks a valid capability reference.
