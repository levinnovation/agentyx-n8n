# Agent

Euromobilia Quotation Assistant — FastAPI / LangGraph runtime.

Image: `ghcr.io/<org>/euromobilia-agent-quotation-assistant:<sha>`

The image is built by CI and deployed via the `AGENT_IMAGE` Railway variable.

## Auth verification

The agent can verify JWTs issued by the tenant's `better-auth` service via JWKS:

```
BETTER_AUTH_JWKS_URL=http://better-auth.railway.internal:3000/jwks.json
BETTER_AUTH_ISSUER=<better-auth-url>
BETTER_AUTH_AUDIENCE=agent
AUTH_REQUIRED=false
```

Set `AUTH_REQUIRED=true` to enforce JWT validation on protected endpoints.
