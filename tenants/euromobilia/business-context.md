# Euromobilia Business Context

## Overview

Euromobilia sells kitchen furniture and home appliances in Costa Rica. Their primary sales channel is WhatsApp, managed via the Kapso provider. Customers send photos, ask for prices, and request full kitchen quotations.

## Key Processes

1. **Inbound Quotation Request** — Customer messages via WhatsApp → AI classifies intent → gathers missing info → retrieves catalog → composes quotation → sends reply.
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
