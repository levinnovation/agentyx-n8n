# Twenty CRM On-Update Interactions (Levinnovation)

Subworkflow called by `Customer Service Core (Levinnovation)` to execute CRM side effects and build the final channel response.

## Responsibilities

- Parse agent response text + embedded JSON metadata
- Upsert person in Twenty CRM
- Resolve/create company and link person to company
- Resolve/create opportunity for qualified leads
- Emit feedback webhook when configured
- Persist lightweight audit trail and return output envelope

## Input

Receives one item from the parent workflow AI branch, typically with:

- `channel`
- `conversation_id`
- `user_id`
- `message` / `enriched_message`
- `output` (AI raw output with optional fenced JSON)

## Output

Returns canonical response envelope:

- `reply_text`
- `reply_attachments`
- `end_session`
- `metadata` with lead and automation context
