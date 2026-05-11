# LEV Innovation

Internal tenant for LEV Innovation commercial automation.

## Domains

- `sales-prospecting/` - AI-assisted prospecting and outbound orchestration
- `customer-service/` - Inbound lead qualification, meeting scheduling, and multi-channel support

## Primary assets

### Sales Prospecting
- `assets/workflows/n8n/agente-prospectador-ai.json` - deterministic lead prospecting workflow
- `assets/prompts/agente-prospectador.system.md` - OpenRouter system prompt for qualification and outreach
- `assets/data/lev-innovation-knowledge.md` - source text loaded into the workflow's Simple Vector Store

### Customer Service
- `assets/workflows/n8n/customer-service-core/` - reusable AI agent core (Gemini, Redis memory, KB retrieval, Twenty CRM, Composio calendar)
- `assets/workflows/n8n/chan-kapso-wa-customer-service/` - Kapso WhatsApp adapter
- `assets/workflows/n8n/chan-telegram-customer-service/` - Telegram adapter
- `assets/workflows/n8n/chan-meta-comments-customer-service/` - Meta Facebook/Instagram comment auto-reply adapter
- `assets/prompts/customer-service-agent.system.md` - system prompt for customer service AI agent
- `assets/data/customer-service-knowledge.md` - knowledge base for inbound engagement
