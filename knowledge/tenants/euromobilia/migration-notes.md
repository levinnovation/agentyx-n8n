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

## 2026-05-04 — Railway tenant stack (ADR-0010)

- **Date:** 2026-05-04
- **From:** Hostinger VPS (`n8n-hostinger`, `agent-hostinger`)
- **To:** Railway per-tenant project (`euromobilia-railway-stack`)
- **Reason:** Consolidate n8n, agent, LibreChat, Paperclip, Langfuse, and portal into a single Railway project with CLI-driven CI/CD. Deprecate manual SSH-based Hostinger deploys.
- **ADR:** `knowledge/decisions/0010-per-tenant-railway-project-as-canonical-runtime.md`
- **Validation:** `make validate` and `make knowledge-index` after migration.
- **Manual steps required:**
  - Run `bootstrap-tenant-railway.yml` (workflow_dispatch) to create the Railway project.
  - Save the returned `EUROMOBILIA_RAILWAY_PROJECT_ID` as a GitHub variable.
  - Populate all secrets in GitHub Actions (union of `services/<svc>/.env.example` keys).
  - Point Kapso webhook URLs at the Railway `n8n` public domain.
  - Migrate n8n workflows and credentials from Hostinger instance (or re-import from repo JSON).
  - Verify Langfuse traces flow correctly from the `agent` service.
