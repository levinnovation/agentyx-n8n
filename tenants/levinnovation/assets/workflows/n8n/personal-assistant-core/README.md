# Personal Assistant Core (Levinnovation)

Reusable sub-workflow for multi-channel chat adapters.

## Input envelope

Provide one item with:

- `channel`
- `conversation_id`
- `user_id`
- `message`
- `attachments` (array)
- `metadata` (object)

## Output envelope

Returns:

- `reply_text`
- `reply_attachments` (array)
- `end_session` (boolean)

## Nodes

1. `Execute Workflow Trigger` receives input from channel adapters.
2. `Normalize Envelope` guarantees stable fields.
3. `AI Agent` produces response using:
   - `OpenRouter Chat Model`
   - `MCP Client Tool (Composio)`
4. `Build Response` emits canonical output.
