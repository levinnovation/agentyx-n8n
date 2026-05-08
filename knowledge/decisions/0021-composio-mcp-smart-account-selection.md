# ADR-0021: Smart Connected Account Selection for Composio MCP

**Status:** Accepted  
**Date:** 2026-05-07

## Context

The `services/composio-mcp` bridge powers n8n MCP tool execution for tenant
workflows. Operators reported two recurring issues:

1. Repeated `connected_accounts_refresh_error` logs caused by incompatible
   parsing assumptions against Composio v3.1 connected account payloads.
2. Gmail execution failures even when OAuth accounts were connected, because
   account selection relied on a single global `COMPOSIO_CONNECTED_ACCOUNT_ID`.

The bridge needed smarter and safer account selection while preserving explicit
operator control.

## Decision

1. Update connected-account discovery to Composio v3.1-compatible behavior:
   - query `connected_accounts` using `user_ids[]`,
   - parse `toolkit.slug` with legacy `appName` fallback,
   - normalize status casing and paginate on `next_cursor`.
2. Introduce a registry that ranks candidate accounts per toolkit by:
   - ACTIVE status,
   - most recent `updated_at`,
   - most scopes,
   - deterministic id tie-break.
3. Select `connected_account_id` for tool execution with precedence:
   - `x-connected-account-id` request header,
   - registry best match for toolkit/entity,
   - `COMPOSIO_CONNECTED_ACCOUNT_ID` env fallback,
   - none.
4. Support per-request `x-entity-id` and `x-connected-account-id` headers on
   `/mcp`.
5. Add authenticated `GET /accounts` debug endpoint to inspect account
   visibility and toolkit grouping.

## Consequences

### Positive

- Reduces false error noise from connected-account refreshes.
- Improves reliability for toolkit-specific actions (e.g., Gmail send email).
- Preserves deterministic operator override capabilities per workflow.
- Improves observability via `mcp_account_selected` and `/accounts`.

### Negative

- Adds stateful ranking logic to the MCP bridge.
- Slightly increases request-time complexity for tool execution selection.

## Rejected alternatives

- Header-only selection (no server auto-pick) - rejected due poor defaults.
- Server auto-pick only (no headers) - rejected due missing workflow control.
- Keep global env-only account id - rejected due ambiguity across toolkits.
