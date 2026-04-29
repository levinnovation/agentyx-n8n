# Prompt Log: Migrate AUREA to Euromobilia Kitchen Commerce

**Tool:** Cursor  
**Date:** 2026-04-29  
**Prompt ID:** 0005

## Objective

Implement the full migration plan from `aurea-aragroupcr/` to `tenants/euromobilia/` end-to-end, covering all 9 phases: inventory, specs, contracts, runtime, workflows, infra, evals, knowledge ledger, and final report.

## Plan reference

- Plan file: `/Users/vinicioflores/.cursor/plans/aurea-to-euromobilia-migration_c4610789.plan.md`

## Key decisions during execution

1. Kept `type:` (not `asset_type`) in all `asset.yaml` files to comply with `standards/asset-spec.schema.json`.
2. Added `runtime`, `legacy_source`, `depends_on`, `required_env` as extra properties in agent `asset.yaml` (schema allows additional properties).
3. Consolidated `agent_prompt.py` + `system-prompt.ts` into `assets/prompts/quotation-assistant.system.md`.
4. Split `intake_form.py` into `intent-router.system.md` + `quote-consolidation.system.md`.
5. Ported all 7 tools and 3 knowledge modules from legacy Python with minimal changes.
6. Marked all new channel/integrations/n8n assets as `status: scaffolded`.

## Files touched

~60 files created or updated across:
- `tenants/euromobilia/`
- `knowledge/`

## Validation run

- `make validate`
- `make knowledge-index`
