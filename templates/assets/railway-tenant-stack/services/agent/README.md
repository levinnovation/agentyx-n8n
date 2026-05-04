# Agent

FastAPI / LangGraph agent runtime.

## Image

The image is **per-tenant and per-capability**. For example:

```
ghcr.io/<org>/euromobilia-agent-quotation-assistant:<sha>
```

This service slot is generic. The actual image is set via the `AGENT_IMAGE` Railway variable, updated by CI on every push.

## Ports

- `8000` — FastAPI app

## Auth verification

The agent can verify JWTs issued by the tenant's `better-auth` service via JWKS:

```
BETTER_AUTH_JWKS_URL=http://better-auth.railway.internal:3000/jwks.json
BETTER_AUTH_ISSUER=<better-auth-url>
BETTER_AUTH_AUDIENCE=agent
AUTH_REQUIRED=false
```

Set `AUTH_REQUIRED=true` to enforce JWT validation on protected endpoints.

## Environment

See `.env.example` for required variables.
