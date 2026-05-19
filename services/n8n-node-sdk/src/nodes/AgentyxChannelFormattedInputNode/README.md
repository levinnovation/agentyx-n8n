# Agentyx Channel Formatted Input Node

Normalizes channel-specific payloads into a canonical envelope.

## What it replaces

Replaces 50-200 line JavaScript code nodes in every channel adapter workflow:
- `Validate + Normalize` (Kapso WhatsApp)
- `Validate + Normalize` (Telegram)
- `Normalize Comment` (Meta)
- `Normalize Payload` (LibreChat)
- `Normalize Twenty Event` (Twenty Webhook)

## Supported Channels

| Channel | Input | Normalized Output Fields |
|---------|-------|--------------------------|
| Kapso WhatsApp | Kapso webhook payload | `channel`, `conversation_id`, `user_id`, `message`, `attachments`, `metadata` |
| Telegram | Telegram Bot webhook | Same + `metadata.chat_id`, `username` |
| Meta Comment | Meta/Instagram comment | Same + `metadata.comment_id`, `post_id`, `platform` |
| LibreChat | LibreChat payload | Pass-through |
| Twenty Webhook | Twenty CRM webhook | `metadata.event`, `object_type`, `action`, `record` |
| Generic | Any JSON | Best-effort mapping |

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Channel | options | `kapso-wa` | Source channel |
| Payload | json | `={{ JSON.stringify($json) }}` | Raw incoming payload |
| Core Workflow ID | string | "" | ID of downstream core workflow |
| Deduplication TTL | number | 15 | Minutes to detect duplicate message_ids |

## Output

```json
{
  "channel": "kapso-wa",
  "core_workflow_id": "n0mTwpONyCbbyn2E",
  "conversation_id": "...",
  "user_id": "+1234567890",
  "message": "Hello",
  "attachments": [{"type": "image", "url": "...", "mime_type": "image/jpeg"}],
  "metadata": { "message_id": "...", "contact_name": "..." },
  "duplicate_message": false
}
```

## Usage in SDLC

Every channel adapter workflow must start with this node. It guarantees a consistent canonical envelope that all core workflows can depend on.

## References

- `knowledge/context-packs/n8n-sdk-context.md`
- `standards/policies/n8n-node-policy.md`
