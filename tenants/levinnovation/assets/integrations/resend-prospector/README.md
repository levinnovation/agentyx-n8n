# Resend Email Integration (Prospector)

Email delivery layer for the prospector system.

**Used by:**
- `prospector-agent-messenger` — sends personalized outreach emails to leads
- `prospector-inbound-handler` — sends "lead interested" notifications to the sales team

**Auth:** Bearer token via `RESEND_API_KEY` env var.

**Endpoint:** `POST https://api.resend.com/emails`

**Required env vars:**
- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_EMAIL` — sender address (e.g. `prospector@levinnovation.com`)
- `SALES_TEAM_EMAIL` — address(es) that receive interest notifications

**Payload example (outreach):**
```json
{
  "from": "prospector@levinnovation.com",
  "to": "lead@company.com",
  "subject": "Transform your operations with Agentyx",
  "html": "<p>...</p>",
  "reply_to": "ventas@levinnovation.com"
}
```

**Payload example (sales notification):**
```json
{
  "from": "prospector@levinnovation.com",
  "to": "ventas@levinnovation.com",
  "subject": "[LEV Prospector] Interested lead - Juan Perez | Agentyx",
  "html": "<p>Lead responded with interest...</p>"
}
```
