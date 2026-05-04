# Agentyx Portal

Tenant-facing portal SPA.

## Status

TBD — placeholder until the SPA is built and pushed to GHCR.

## Image

```
ghcr.io/<org>/agentyx-portal:latest
```

Set `PORTAL_IMAGE` variable when ready.

## Ports

- `8080` — Static SPA server

## Better Auth integration

When the SPA is built, it will use the Better Auth client SDK (`@better-auth/client`) and point at `BETTER_AUTH_URL` for session management.
