# 2026-04-29: Initial architecture constitution

**Related:** `CONSTITUTION.md`, `DOMAIN_MODEL.md`, `DECISIONS.md`, ADR-0001–0003 (conceptually)

## Summary

Established the vertical-domain-centric model: **tenant → domain → capability → assets**, schema-first specs, tenant isolation, and documentation-first expectations.

## Rationale

Replace tool-centric layouts with business-capability ownership and git-native assets.

## Files / areas

- Root governance docs
- `standards/`, `templates/`, `tenants/euromobilia/`
- `scripts/validate_specs.py`, `Makefile`

## Validation

`make validate`, CI `validate` workflow.

## Risks / rollback

Structural rollback is expensive; prefer forward fixes via new ADRs and migrations.
