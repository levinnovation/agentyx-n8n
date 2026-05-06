# Add levinnovation tenant and prospecting workflow

**Date:** 2026-05-06  
**Related:** ADR-0020

## Summary

Added a new internal tenant (`levinnovation`) with a complete
sales-prospecting domain/capability structure and a deterministic n8n workflow
(`agente-prospectador-ai`) for LinkedIn lead sourcing, qualification, CRM
writeback, and outreach operations.

## Rationale

LEV Innovation needed first-party dogfooding of the same architecture used for
client tenants, while enabling immediate outbound execution with controlled,
auditable automation.

## Files / areas

- `tenants/levinnovation/tenant.yaml`
- `tenants/levinnovation/business-context.md`
- `tenants/levinnovation/security.md`
- `tenants/levinnovation/glossary.md`
- `tenants/levinnovation/domains/sales-prospecting/**`
- `tenants/levinnovation/assets/workflows/n8n/**`
- `tenants/levinnovation/assets/prompts/agente-prospectador.system.md`
- `tenants/levinnovation/assets/data/lev-innovation-knowledge.md`
- `knowledge/decisions/0020-add-levinnovation-as-internal-tenant.md`
- `knowledge/context-packs/levinnovation-context.md`
- `knowledge/tenants/levinnovation/**`

## Validation

- `make validate`
- `make knowledge-index`

## Risks / rollback

- RapidAPI schema changes can break normalization logic; update mapping in the
  workflow code node if provider payload changes.
- In-memory vector store resets each run; acceptable for v1 but not for long
  knowledge growth.
- Rollback by removing `tenants/levinnovation/` and ADR-0020 via revert PR.
