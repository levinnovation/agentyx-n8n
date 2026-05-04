# Langfuse

LLM observability and tracing platform.

## Image

`ghcr.io/langfuse/langfuse:latest` (pin to a specific version in production)

## Ports

- `3000` — Web UI and API

## OIDC sign-in

Langfuse is configured as an OIDC RP against the tenant's `better-auth` service.

```
AUTH_CUSTOM_NAME=Agentyx
AUTH_CUSTOM_ISSUER=<better-auth-url>
AUTH_CUSTOM_CLIENT_ID=<client-id>
AUTH_CUSTOM_CLIENT_SECRET=<client-secret>
AUTH_CUSTOM_SCOPE=openid email profile
```

## First-run init

Langfuse auto-creates the org, project, and admin user on first boot when `LANGFUSE_INIT_*` variables are set.

## Agent integration

The `agent` service sends traces to Langfuse via the `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` variables (LangSmith-compatible env vars used by LangGraph). Langfuse is configured as the trace sink.
