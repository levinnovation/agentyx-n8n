# Agentyx Channel Formatted Output Node

Formats and sends replies to channel-specific APIs.

## What it replaces

Replaces 100-300 line JavaScript code nodes in every channel adapter:
- `Send Reply via Kapso` (WhatsApp Cloud API payload building)
- `Format Reply for Telegram` (HTML escaping, splitting, Bot API)
- Slack block formatting
- Email HTML generation

## Supported Channels

| Channel | Formatting | API Call |
|---------|-----------|----------|
| Kapso WhatsApp | 4096 char limit, media type switching | Kapso WhatsApp Cloud API |
| Telegram | HTML-escape, split by 4096, parse_mode | Telegram Bot API |
| Slack | Block Kit markdown | Slack chat.postMessage |
| Email (Resend) | Markdown→HTML | Resend API (downstream) |
| Generic | Pass-through | None |

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Channel | options | `kapso-wa` | Target channel |
| Reply Text | string | `={{ $json.reply_text }}` | Text to send |
| Recipient ID | string | `={{ $json.user_id }}` | Phone, chat_id, etc. |
| Reply Attachments | json | `[]` | `{type, url}` array |
| Parse Mode | options | `HTML` | Telegram only |
| Email Subject | string | "" | Email only |
| Email To | string | "" | Email only |
| Disable Preview | boolean | true | Telegram only |
| Send Method | options | `api` | `api` = send now, `payload` = return payload |
| Timeout | number | 15000 | Request timeout |

## Credentials

- **Kapso API** (`kapsoApi`) — For WhatsApp
- **Telegram Bot** (`telegramBot`) — For Telegram
- **Slack API** (`slackApi`) — For Slack (if available)

## Output

```json
{
  "channel": "kapso-wa",
  "recipient_id": "+1234567890",
  "sent": true,
  "error": null,
  "payload": { "messaging_product": "whatsapp", ... },
  "response": { "messages": [{"id": "..."}] },
  "metadata": { "timestamp": "...", "text_length": 42 }
}
```

## Usage in SDLC

Every channel adapter workflow must end with this node (or a variant) to ensure consistent outbound formatting and API interaction.

## References

- `knowledge/context-packs/n8n-sdk-context.md`
- `standards/policies/n8n-node-policy.md`
