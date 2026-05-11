# ADR-0028: Multi-channel personal assistant with n8n core + channel adapters + n8n MCP bridge

**Status:** Accepted  
**Date:** 2026-05-08

## Context

LEV Innovation needs one assistant capability reachable from Telegram, Kapso WhatsApp, and LibreChat web chat without duplicating reasoning logic across workflows.

Current state had a single `personal-assistant` workflow built around `Chat Trigger`, which is convenient for direct n8n testing but not ideal as a reusable channel-agnostic runtime.

LibreChat also needs a stable way to invoke selected n8n workflows as tools.

## Decision

1. Introduce `personal-assistant-core` as a reusable n8n sub-workflow using `Execute Workflow Trigger`.
2. Keep `personal-assistant` (Chat Trigger) active as a legacy/demo entrypoint.
3. Add dedicated channel adapters:
   - `chan-telegram-personal-assistant`
   - `chan-kapso-wa-personal-assistant`
   - `chan-librechat-personal-assistant`
4. Standardize adapter-to-core payload contract:
   - input: `channel`, `conversation_id`, `user_id`, `message`, `attachments`, `metadata`
   - output: `reply_text`, `reply_attachments`, `end_session`
5. Add service `services/n8n-mcp-bridge` exposing curated n8n workflows as MCP tools over Streamable HTTP.
6. Protect `n8n-mcp-bridge` with bearer auth and adapter ingress with `X-N8N-Bridge-Secret`.

## Consequences

### Positive

- One assistant logic path reused by all channels.
- Channel-specific concerns isolated in adapters.
- LibreChat can call n8n workflows as MCP tools without custom per-workflow code.
- New workflows can be exposed to LibreChat by registry updates only.

### Trade-offs

- Additional bridge service increases operational surface.
- Secret and variable management expands across n8n, bridge, and LibreChat services.
- External channel registration (Telegram/Kapso console actions) remains required.

## Implementation notes

- Workflow assets are versioned under `tenants/levinnovation/assets/workflows/n8n/`.
- `services/n8n-mcp-bridge` is implemented in TypeScript with `@modelcontextprotocol/sdk`.
- Railway template now includes bridge service and channel runtime variables.
