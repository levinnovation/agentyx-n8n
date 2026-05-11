# 2026-05-11 - Customer Service Multi-Channel Agent

## Summary

Added `customer-service` domain with `lead-qualification-and-scheduling` capability
to the `levinnovation` tenant. This is a full inbound engagement stack with AI agent,
multi-channel adapters, CRM sync, and calendar scheduling.

## Changes

### New domain
- `tenants/levinnovation/domains/customer-service/`
  - `domain.yaml`
  - `README.md`
  - `capabilities/lead-qualification-and-scheduling/`
    - `capability.yaml`
    - `README.md`

### New assets
- `tenants/levinnovation/assets/workflows/n8n/customer-service-core/`
  - Core AI agent workflow (Gemini, Redis memory, KB retrieval, Twenty CRM, Composio calendar)
- `tenants/levinnovation/assets/workflows/n8n/chan-kapso-wa-customer-service/`
  - Kapso WhatsApp adapter (+1 201 534-7251)
- `tenants/levinnovation/assets/workflows/n8n/chan-telegram-customer-service/`
  - Telegram Bot API adapter
- `tenants/levinnovation/assets/workflows/n8n/chan-meta-comments-customer-service/`
  - Meta Facebook/Instagram comment auto-reply adapter (pending Composio toolkit)
- `tenants/levinnovation/assets/prompts/customer-service-agent.system.md`
  - System prompt for BANT qualification and scheduling
- `tenants/levinnovation/assets/data/customer-service-knowledge.md`
  - Knowledge base seed for document loader

### Updated files
- `tenants/levinnovation/tenant.yaml` — added `customer-service` domain
- `tenants/levinnovation/README.md` — documented new domain and assets
- `knowledge/tenants/levinnovation/capability-decisions.md` — added capability decision

## Decisions

- Audio transcription uses OpenAI Whisper (reliable in n8n) while the main agent uses Gemini.
- Meta comment auto-reply is built but flagged as pending until Composio Meta toolkit is connected.
- Twenty CRM URL is a placeholder; will be updated after Railway deployment.
