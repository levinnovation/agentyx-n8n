# DESIGN: Kapso Intake Quotation Workflow

## Overview

WhatsApp interactive intake form router. Replaces the legacy `kapso-inbound-quotation` passthrough with a state-machine-driven interactive experience, while preserving free-text fallback to the agent.

## Data Flow

```
Kapso Webhook → Normalize → Find Session → Route → [Switch branches]
  ├─ welcome/start_intake → Load Template → Start Intake → Create Session → Render → Send
  ├─ advance_step → Advance Step → Action Switch → [render|complete|cancel]
  ├─ cancel_forward/handoff → Cancel Session → Forward to Agent
  └─ forward_agent → Forward to Agent
```

## Nodes

| # | ID | Type | Purpose |
|---|----|------|---------|
| 1 | webhook | webhook | Receives Kapso POST at `/kapso-inbound` |
| 2 | normalize | code | Extracts phone, message, interactive reply from Kapso payload |
| 3 | find-session | httpRequest | Queries Supabase `intake_sessions` for active row |
| 4 | route | code | Determines route based on session + message type |
| 5 | switch | switch | Routes to: welcome(0), advance(1), cancel(2), forward(3) |
| 6 | load-template | httpRequest | Fetches `intake_templates` definition from Supabase |
| 7 | start-intake | code | Initializes first step from template definition |
| 8 | create-session | httpRequest | Inserts new `intake_sessions` row |
| 9 | advance-step | code | Validates reply, updates form_data, resolves next_step |
| 10 | action-switch | switch | Branches: render(0), complete(1), cancel/exit/handoff(2) |
| 11 | update-session | httpRequest | PATCH session with new step + form_data |
| 12 | render-step | code | Builds Kapso `interactive` JSON (button or list) |
| 13 | send-kapso | httpRequest | POST to Kapso Meta API v24.0 |
| 14 | complete-session | httpRequest | PATCH status=completed |
| 15 | admin-notify | httpRequest | WhatsApp text summary to ADMIN_PHONE_NUMBER |
| 16 | forward-agent | httpRequest | POST to `/agent/invoke` with `intake_data` |
| 17 | cancel-session | httpRequest | PATCH status=cancelled |
| 18 | respond | respondToWebhook | Returns 200 JSON to Kapso |

## Routing Rules

### Main Switch (node 5)

| Output | Routes | Condition |
|--------|--------|-----------|
| 0 | Load Template | `welcome`, `start_intake` |
| 1 | Advance Step | `advance_step` |
| 2 | Cancel Session | `cancel_forward`, `handoff` |
| 3 | Forward to Agent | `forward_agent` (fallback) |

### Action Switch (node 10)

| Output | Routes | Condition |
|--------|--------|-----------|
| 0 | Update Session → Render | `action == 'render'` |
| 1 | Complete Session → Admin Notify → Agent | `action == 'complete'` |
| 2 | Forward to Agent | `action == '_cancel'`, `'_handoff'`, `'_exit_to_agent'` |

## Template Definition JSONB Shape

```json
{
  "slug": "kitchen-quotation",
  "language": "es",
  "first_step": "welcome",
  "complete_step": "complete",
  "steps": [
    {
      "id": "welcome",
      "type": "interactive_list",
      "prompt": "Hola {{contact_name}}, en que te ayudo?",
      "sections": [{"title": "Opciones", "rows": [...]}]
    },
    {
      "id": "project_type",
      "type": "interactive_button",
      "field": "project_type",
      "options": [{"id": "new", "title": "Nueva Cocina", "next": "budget_range"}]
    }
  ]
}
```

## Step Types

- `interactive_button`: max 3 buttons, uses Meta `interactive.type=button`
- `interactive_list`: single-select list, uses Meta `interactive.type=list`
- `_complete`: terminal step, sends text message, triggers completion

## Multi-Select Pattern

WhatsApp interactive lists are single-select. For multi-select fields (e.g., `appliances`), the template uses:
1. `multi_repeat: true` on the step
2. A follow-up `ask_another_appliance` button step with "Si, agregar otro" / "No, continuar"
3. Selections are accumulated in `form_data[field]` as an array

## Prompt Substitution

The `render-step` node substitutes template variables:
- `{{contact_name}}` → from conversation
- `{{field_name}}` → from `form_data`
- Arrays are joined with `, `

## Env Vars Required

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `KAPSO_BASE_URL` (e.g. `https://api.kapso.ai/meta/whatsapp/v24.0`)
- `KAPSO_PHONE_NUMBER_ID`
- `KAPSO_API_KEY`
- `AGENT_BASE_URL`
- `ADMIN_PHONE_NUMBER`

## Deployment Notes

1. Only one workflow can own the `/kapso-inbound` webhook path at a time.
2. Import this workflow, activate it, then deactivate the legacy `kapso-inbound-quotation` workflow.
3. Rollback: deactivate this workflow, reactivate the legacy one. No data migration needed.

## Testing

```bash
# Simulate welcome trigger
curl -X POST http://187.127.252.161/webhook/kapso-inbound \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"text","text":{"body":"hola"}},"conversation":{"id":"test","phone_number":"50672249451","contact_name":"Test"}}'

# Simulate button reply
curl -X POST http://187.127.252.161/webhook/kapso-inbound \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"interactive","interactive":{"type":"button_reply","button_reply":{"id":"start_intake","title":"Cotizar Cocina"}}},"conversation":{"id":"test","phone_number":"50672249451"}}'
```
