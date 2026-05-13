# 2026-05-12 — Customer Service MCP-First Router Rollout

## What changed

- Hardened `customer-service-core` to reduce immediate token pressure:
  - Redis memory window reduced to 6 turns.
  - Agent max iterations reduced to 3.
  - Removed duplicate Twenty on-update tool attachment from agent tool surface.
  - Capped KB prefetch query length and KB merge payload size.
  - Added MCP compression headers (`x-compressed-tools`, `x-tool-verbosity`) and lowered `x-max-tools` to 4.

- Added multi-agent routing assets under tenant workflow tree:
  - `customer-service-router`
  - `customer-service-faq-rag-core`
  - `customer-service-action-core`

- Cut over channel adapters to single router entrypoint:
  - Telegram
  - Kapso WA
  - Meta comments
  - Twenty inbound webhook

- Enhanced Composio MCP server for compression/proxy mode:
  - Enforces request-level `x-allowed-toolkits` filtering server-side.
  - Supports compressed tool listing mode via headers:
    - `x-compressed-tools: 1`
    - `x-tool-verbosity: none|minimal|brief`
  - Added compact discovery and schema-on-demand meta tools:
    - `composio_list_tools`
    - `composio_get_tool_schema`
    - `composio_execute_tool` (existing bridge preserved)

## Validation

- New workflows created and active in n8n:
  - FAQ core: `rYpSpcIwFXn3yqhJ`
  - Action core: `WZHj0j8kKT51abJ6`
  - Router: `fM29GJKgwpCujakW`
- Router verified active and correctly bound to FAQ/Action workflow IDs.
- Channel adapters redeployed and referencing router workflow ID.
- MCP service code compiled and tests passing (`npm test` in `services/composio-mcp`).

## Rollout notes

- This is a compatibility-first split: FAQ and Action cores currently delegate to existing core while routing and compression controls are in place.
- Next iteration should specialize prompts and tool sets per split core to fully realize token isolation.
