# Euromobilia — migration notes

Use this file when moving assets between capabilities, renaming slugs, or absorbing legacy paths.

## Template entry

- **Date:**
- **From → To:**
- **Reason:**
- **Validation:** `make validate` output / PR link

## 2026-04-29 — Multi-interface channels (ADR-0007)

- **Decision:** `knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`
- **Reason:** Clarify that the repo architecture is **not** “WhatsApp-first”; capabilities are interface-agnostic and Kapso WhatsApp is the first channel asset among many allowed surfaces.
- **Validation:** `make validate` after doc updates; `make knowledge-index` to refresh the knowledge index.

## 2026-04-29 — AUREA legacy backend migration (ADR-0008)

- **Date:** 2026-04-29
- **From:** `aurea-aragroupcr/` (Modal + CopilotKit AG-UI + React frontend)
- **To:** `tenants/euromobilia/assets/` (LangGraph + FastAPI + Kapso)
- **Reason:** Re-platform the legacy backend to align with the vertical-domain-centric asset framework. Backend and business logic only; frontend dropped.
- **ADR:** `knowledge/decisions/0008-migrate-aurea-to-euromobilia-kitchen-commerce.md`
- **Validation:** `make validate` and `make knowledge-index` after migration.
- **Manual steps required:**
  - Configure Kapso API credentials in environment.
  - Configure OpenRouter API key and fallback tiers.
  - Set up Bitrix24 webhook URL.
  - Set up Slack webhook URL.
  - Deploy Supabase edge functions (`quote-pdf`, `bitrix24-bridge`).
  - Review image generation pipeline at runtime.
