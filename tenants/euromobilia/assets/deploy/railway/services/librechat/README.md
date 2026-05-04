# LibreChat

Open-source chat UI wired to the Euromobilia agent.

Custom endpoint points at the internal `agent` service.

## OIDC sign-in

LibreChat is configured as an OIDC RP against the tenant's `better-auth` service.

```
OPENID_ISSUER=<better-auth-url>
OPENID_CLIENT_ID=<client-id>
OPENID_CLIENT_SECRET=<client-secret>
OPENID_SCOPE=openid email profile
OPENID_BUTTON_LABEL=Sign in with Agentyx
```
