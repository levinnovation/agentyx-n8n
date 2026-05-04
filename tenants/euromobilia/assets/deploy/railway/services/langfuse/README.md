# Langfuse

LLM observability for the Euromobilia agent.

Image: `ghcr.io/langfuse/langfuse:3.52`

## OIDC sign-in

Langfuse is configured as an OIDC RP against the tenant's `better-auth` service.

```
AUTH_CUSTOM_NAME=Agentyx
AUTH_CUSTOM_ISSUER=<better-auth-url>
AUTH_CUSTOM_CLIENT_ID=<client-id>
AUTH_CUSTOM_CLIENT_SECRET=<client-secret>
AUTH_CUSTOM_SCOPE=openid email profile
```
