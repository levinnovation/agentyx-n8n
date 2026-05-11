# Channel Adapter: Meta Comments Customer Service

Auto-reply adapter for Facebook and Instagram comments via Composio.

## Endpoint

- n8n webhook path: `composio/meta-comments-customer-service`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/composio/meta-comments-customer-service`

## Security

- Validates `X-Auth-Proxy-Secret` against `N8N_AUTH_TRUSTED_PROXY_SECRET`.

## Flow

1. Receives Composio trigger payload for Meta comments.
2. Normalizes comment to canonical envelope.
3. Executes `customer-service-core`.
4. Replies to comment via Composio Meta tools (when connected).

## Status

⚠️ **PENDING**: Meta Business Suite toolkit must be connected in Composio before auto-reply works. Until then, comments are logged for manual review.

## Required environment variables

- `N8N_AUTH_TRUSTED_PROXY_SECRET`
- `CUSTOMER_SERVICE_CORE_WORKFLOW_ID`

## Setup

1. Connect Meta Business Suite toolkit in Composio.
2. Update the `CUSTOMER_SERVICE_CORE_ID` placeholder.
3. Update `hasMetaToolkit` flag in `Reply via Meta` node to `true`.
4. Activate the workflow.
