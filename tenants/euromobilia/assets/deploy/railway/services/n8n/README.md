# n8n

n8n Community Edition for Euromobilia workflows.

Image: `n8nio/n8n:1.84.0`

Workflows are versioned in Git under `tenants/euromobilia/assets/workflows/n8n/`.

## Public access via auth-proxy

Human-facing access to n8n is gated by the `auth-proxy` service (Caddy `forward_auth`).
Unauthenticated requests are redirected to Better Auth.

Basic auth env vars (`N8N_BASIC_AUTH_*`) remain as defense-in-depth.
