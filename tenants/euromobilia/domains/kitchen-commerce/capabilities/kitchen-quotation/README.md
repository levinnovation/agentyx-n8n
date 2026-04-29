# Kitchen Quotation Capability

The primary AI-driven quotation flow for Euromobilia.

## Purpose

Automate end-to-end kitchen quotations. **Channel-agnostic capability:** customer traffic can enter via WhatsApp (Kapso), and over time via other channel assets (Slack, Teams, web widget, web chat, Telegram, etc.).

## Assets

- `quotation-assistant` — LangGraph agent
- `kapso-inbound-quotation` — n8n workflow
- `whatsapp-kapso` — Channel adapter
- `bitrix24` — CRM integration
- `slack` — Internal notifications
- `composio` — Tool orchestration
- `product-catalog` — Data contract
- `catalog-rag` — RAG contract
- `supabase` — Infrastructure

## Documentation

- `docs/architecture.md` — Architecture decisions
- `deployment.md` — Deployment guide
- `operations.md` — Operations runbook
- `runbook.md` — Incident response

## Policies

All policies are defined in `policies.yaml`.
