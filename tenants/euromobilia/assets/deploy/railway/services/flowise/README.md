# Flowise

Optional low-code agent builder for Euromobilia.

Disabled by default. Enable with `FLOWISE_ENABLED=true`.

## Public access via auth-proxy

Human-facing access to Flowise is gated by the `auth-proxy` service (Caddy `forward_auth`).
Unauthenticated requests are redirected to Better Auth.

Basic auth env vars (`FLOWISE_USERNAME`, `FLOWISE_PASSWORD`) remain as defense-in-depth.
