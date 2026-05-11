# Lead Qualification and Scheduling

AI-powered inbound engagement capability.

## Purpose

Convert inbound conversations into qualified CRM leads and scheduled meetings.

## Assets

| Asset | Type | Description |
|---|---|---|
| `customer-service-core` | n8n-workflow | Reusable AI agent with Gemini, Redis memory, KB retrieval, Twenty CRM, and Composio calendar |
| `chan-kapso-wa-customer-service` | n8n-workflow | Kapso WhatsApp adapter |
| `chan-telegram-customer-service` | n8n-workflow | Telegram Bot API adapter |
| `chan-meta-comments-customer-service` | n8n-workflow | Meta Facebook/Instagram comment auto-reply adapter |
| `customer-service-agent` | prompt | System prompt for the AI agent |
| `customer-service-knowledge` | data | Knowledge base seed for document loader |

## Entry Points

- WhatsApp: `POST https://levinnovation.n8n.agentyx.one/webhook/kapso/customer-service`
- Telegram: `POST https://levinnovation.n8n.agentyx.one/webhook/telegram/customer-service`
- Meta Comments: `POST https://levinnovation.n8n.agentyx.one/webhook/composio/meta-comments-customer-service`
