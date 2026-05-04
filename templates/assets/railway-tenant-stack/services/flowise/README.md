# Flowise

Optional low-code agent builder.

## Status

Off by default. Enable by setting `FLOWISE_ENABLED=true` in project variables before running bootstrap.

## Image

`flowiseai/flowise:latest`

## Ports

- `3000` — Web UI

## Public access via auth-proxy

Human-facing access to Flowise is gated by the `auth-proxy` service (Caddy `forward_auth`).
Unauthenticated requests are redirected to Better Auth.

Basic auth env vars (`FLOWISE_USERNAME`, `FLOWISE_PASSWORD`) remain as defense-in-depth.

## Environment

See `.env.example` for required variables.
