# LibreChat

Open-source chat UI with custom endpoint support.

## Custom endpoint

LibreChat is configured to point its "Custom Endpoint" at the internal `agent` service URL:

```
CUSTOM_BASE_URL=http://agent.railway.internal:8000
```

## OIDC sign-in

LibreChat is configured as an OIDC RP against the tenant's `better-auth` service.

```
OPENID_ISSUER=<better-auth-url>
OPENID_CLIENT_ID=<client-id>
OPENID_CLIENT_SECRET=<client-secret>
OPENID_SCOPE=openid email profile
OPENID_BUTTON_LABEL=Sign in with Agentyx
```

## Environment

See `.env.example` for required variables.
