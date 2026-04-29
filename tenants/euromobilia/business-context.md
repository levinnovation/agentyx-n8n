# Euromobilia Business Context

## Overview

Euromobilia sells kitchen furniture and home appliances in Costa Rica. **Commercially**, their lead channel today is WhatsApp (Kapso). **Architecturally**, AI-enabled quotation is delivered through **tenant-level assets** (agent, workflows, channel adapters); additional surfaces—Slack, Microsoft Teams, web widget, web chat, Telegram, and others—can be attached as separate channel assets without changing the core capability model (see `knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`). Customers send photos, ask for prices, and request full kitchen quotations.

Euromobilia is part of the ARA Group, a conglomerate of home and lifestyle retailers in Central America.

## Key Processes

1. **Inbound Quotation Request** — Customer or operator messages through a **channel** (today often WhatsApp via Kapso) → ingress normalizes the payload → AI classifies intent → gathers missing info → retrieves catalog → composes quotation → sends reply on the same channel.
2. **Human Handoff** — When the AI cannot answer or the customer requests a human, the conversation is escalated to a sales agent.
3. **Document Generation** — Approved quotations generate a PDF quote document sent to the customer.
4. **Catalog Updates** — Product catalog and pricing are maintained in Supabase and synced to the RAG vector store.

## Customer Segments

- B2C: Homeowners renovating kitchens
- B2B: Contractors and interior designers

## Success Metrics

- Response time < 2 minutes
- Quotation accuracy > 95%
- Human handoff rate < 15%
- Customer satisfaction > 4.5/5

## Channels (interfaces)

- **In production today (example):** WhatsApp via Kapso (`whatsapp-kapso` channel asset).
- **Planned / optional:** Slack, Microsoft Teams, web widget, embedded web chat, Telegram—each as its own channel-adapter asset wired to the same `kitchen-quotation` capability where needed.

## Legacy System

Previously operated as "AUREA" (internal codename). The AUREA backend has been re-platformed from Modal + CopilotKit to LangGraph + FastAPI, with channel-specific adapters (Kapso first) layered as assets. The legacy React/Vite frontend is not part of this migration.
