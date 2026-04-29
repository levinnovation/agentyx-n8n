# Architecture

> Architecture documentation for kitchen-quotation.

The **capability** is not defined by a single vendor or channel. **Customer and operator interfaces** are pluggable **channel-adapter** assets; **Kapso WhatsApp** is the first wired example. See ADR-0007 (`knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`).

## Diagram

```mermaid
flowchart LR
    subgraph channels [Channel assets pluggable per tenant]
        WA[whatsapp-kapso]
        Future[Future Slack, Teams, web widget, web chat, Telegram, etc.]
    end
    channels --> Ingress[n8n ingress and routing]
    Ingress --> LangGraph[LangGraph quotation-assistant]
    LangGraph --> Supabase[Supabase]
    LangGraph --> Bitrix24[Bitrix24]
    LangGraph --> SlackOps[Slack alerts and handoff]
```

## Components

1. **Channel adapters** — Normalize inbound/outbound traffic per surface (e.g. `whatsapp-kapso`); add more assets for more surfaces.
2. **n8n** — Webhook ingress, deduplication, and routing (can fan in multiple channels over time).
3. **LangGraph** — Core quotation logic (interface-agnostic).
4. **Supabase** — Catalog, memory, and document storage
5. **Bitrix24** — CRM sync
6. **Slack** — Internal alerts and human handoff (distinct from “Slack as a customer channel” if added later).

## TODO

- [ ] Add sequence diagram
- [ ] Document failure modes
