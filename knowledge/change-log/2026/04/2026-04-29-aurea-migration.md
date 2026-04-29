# Change Record: AUREA → Euromobilia Kitchen Commerce Migration

**Date:** 2026-04-29
**Tenant:** euromobilia
**Domain:** kitchen-commerce
**Capability:** kitchen-quotation

## Summary

Migrated the legacy AUREA backend (Modal-hosted LangGraph agent + Supabase + business logic) into the vertical-domain-centric asset framework under `tenants/euromobilia/`.

## What changed

### New files

- `tenants/euromobilia/domains/kitchen-commerce/docs/legacy-inventory.md`
- `tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/assets.yaml`
- `tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/tests.yaml`
- `tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/docs/deployment.md`
- `tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/docs/runbook.md`
- `tenants/euromobilia/assets/channels/whatsapp-kapso/channel.yaml`
- `tenants/euromobilia/assets/data/product-catalog/data-contract.yaml`
- `tenants/euromobilia/assets/data/rag/rag-contract.yaml`
- `tenants/euromobilia/assets/data/storage/storage-contract.yaml`
- `tenants/euromobilia/assets/integrations/kapso/asset.yaml`
- `tenants/euromobilia/assets/integrations/openrouter/asset.yaml`
- `tenants/euromobilia/assets/prompts/*.system.md` (4 prompts)
- `tenants/euromobilia/assets/agents/quotation-assistant/app/**/*.py` (runtime + tools + knowledge)
- `tenants/euromobilia/assets/agents/quotation-assistant/langgraph.json`
- `tenants/euromobilia/assets/workflows/n8n/quote-document-generation.json`
- `tenants/euromobilia/assets/infra/supabase/schema.sql`
- `tenants/euromobilia/assets/infra/supabase/policies.sql`
- `tenants/euromobilia/assets/infra/supabase/storage.sql`
- `tenants/euromobilia/assets/infra/supabase/migrations/0001_commercial_pricing_rules.sql`
- `tenants/euromobilia/assets/infra/supabase/migrations/0002_app_settings.sql`
- `tenants/euromobilia/assets/infra/supabase/functions/quote-pdf/index.ts`
- `tenants/euromobilia/assets/infra/supabase/functions/bitrix24-bridge/index.ts`
- `tenants/euromobilia/assets/infra/terraform/*.tf`
- `tenants/euromobilia/assets/evals/*.eval.yaml` (4 evals)
- `knowledge/decisions/0008-migrate-aurea-to-euromobilia-kitchen-commerce.md`
- `knowledge/prompts/cursor/0005-migrate-aurea-to-euromobilia.md`

### Updated files

- `tenants/euromobilia/tenant.yaml`
- `tenants/euromobilia/business-context.md`
- `tenants/euromobilia/domains/kitchen-commerce/domain.yaml`
- `tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/capability.yaml`
- `tenants/euromobilia/assets/agents/quotation-assistant/asset.yaml`
- `tenants/euromobilia/assets/agents/quotation-assistant/tools.yaml`
- `tenants/euromobilia/assets/agents/quotation-assistant/memory.yaml`
- `tenants/euromobilia/assets/agents/quotation-assistant/Dockerfile`
- `tenants/euromobilia/assets/agents/quotation-assistant/pyproject.toml`
- `tenants/euromobilia/assets/infra/supabase/asset.yaml`
- `knowledge/tenants/euromobilia/migration-notes.md`

## Validation

- `make validate` executed.
- `make knowledge-index` executed.

## Risks

- Image generation logic ported as-is; needs runtime review.
- Kapso channel and integration contracts are scaffolds; require manual credential setup.
- No frontend UI migrated (WhatsApp-first only).
