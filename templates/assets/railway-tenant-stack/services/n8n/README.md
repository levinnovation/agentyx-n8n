# n8n

n8n Community Edition workflow automation engine.

## Image

`n8nio/n8n:latest` (pin to a specific version in production)

## Ports

- `5678` — Web UI and webhooks

## Public access via auth-proxy

Human-facing access to n8n is gated by the `auth-proxy` service (Caddy `forward_auth`).
Unauthenticated requests are redirected to Better Auth.

Basic auth env vars (`N8N_BASIC_AUTH_*`) remain as defense-in-depth.

## Webhook URL

Set `WEBHOOK_URL` to the public Railway domain of this service so external triggers (Kapso WhatsApp, etc.) can reach n8n webhooks.

## Workflows

Version workflows in Git under `tenants/{tenant}/assets/workflows/n8n/` and import them via the n8n UI or REST API.
