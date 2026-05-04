# Paperclip

AI-team orchestrator built from the [paperclipai/paperclip](https://github.com/paperclipai/paperclip) repository.

## Build

There is no official published image today. The service is built from source using the Dockerfile in this directory, pinned to a specific upstream commit.

## Ports

- `3000` — Web UI and API

## Public access via auth-proxy

Human-facing access to Paperclip is gated by the `auth-proxy` service (Caddy `forward_auth`).
Unauthenticated requests are redirected to Better Auth.

## Environment

See `.env.example` for required variables.

## TODO

Swap to an official upstream image when published.
