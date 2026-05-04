# Auth Proxy

Caddy 2 reverse proxy with `forward_auth` gating for n8n, Flowise, and Paperclip.

## Role

Sits in front of apps that don't speak OIDC natively. Unauthenticated requests are redirected to Better Auth; authenticated requests receive `X-Auth-User` and `X-Auth-Email` headers.

## Caddyfile

Each upstream is a subdomain handled by Caddy:
- `n8n.<tenant-domain>` → n8n
- `flowise.<tenant-domain>` → Flowise
- `paperclip.<tenant-domain>` → Paperclip

The `Caddyfile.template` is rendered at startup with env vars.

## Environment

See `.env.example` for required variables.
