# Paperclip

AI-team orchestrator for Euromobilia.

Built from `paperclipai/paperclip` at a pinned commit.

## Public access via auth-proxy

Human-facing access to Paperclip is gated by the `auth-proxy` service (Caddy `forward_auth`).
Unauthenticated requests are redirected to Better Auth.
