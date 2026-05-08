# auth-proxy (levinnovation)

Caddy forward-auth gateway for public tenant entry points.

For n8n host `levinnovation.n8n.agentyx.one`:

- UI/API traffic is authenticated and proxied to `n8n-main`.
- Webhook/form/oauth callback traffic is proxied to `n8n-webhook`.
