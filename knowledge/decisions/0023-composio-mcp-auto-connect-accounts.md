# ADR-0023: Auto-Create Composio Connected Accounts via MCP

**Status:** Accepted  
**Date:** 2026-05-07

## Context

Prompt-inferred tool discovery improves visibility, but execution still fails
when the requested toolkit has no connected account for the target entity.
Operators asked for auto-creation support to reduce manual setup friction.

Auto-connect introduces security and UX risks:
- OAuth flows require explicit user consent in browser.
- API-key connections may include sensitive credentials.
- Unrestricted automatic connection creation could be abused by the model.

## Decision

1. Add opt-in toolkit gating with `COMPOSIO_AUTO_CONNECT_TOOLKITS` (CSV
   allowlist). Empty value disables auto-connect behavior entirely.
2. Add meta-tools (only when auto-connect allowlist is non-empty and explicit
   tool allowlists are not forcing a reduced surface):
   - `composio_initiate_connection`,
   - `composio_check_connection`.
3. Implement `initiateConnectedAccount()` using Composio `auth_configs` +
   `connected_accounts` APIs:
   - OAuth: return `redirect_url` for user completion.
   - API-key: accept explicit `credentials` object and create directly.
4. Add implicit execute fallback for missing-connection errors:
   - only for allowlisted toolkits,
   - only OAuth path (API-key requires explicit user-provided credentials),
   - return structured `missing_connection` payload to the agent.
5. Never log credential values; only log credential key names.

## Consequences

### Positive

- Reduces connection setup friction directly from agent workflows.
- Preserves user consent for OAuth while enabling a guided retry flow.
- Keeps sensitive connection scope constrained to operator-allowlisted toolkits.

### Negative

- More moving parts in execution error handling and tool dispatch.
- API-key passthrough still requires careful prompt/tool governance.

## Rejected alternatives

- Fully automatic account creation for all toolkits - rejected for security.
- OAuth-only support - rejected because requested scope includes API-key
  passthrough with explicit credentials.
- Implicit API-key fallback on execute errors - rejected because credentials
  must remain explicit and user-provided.
