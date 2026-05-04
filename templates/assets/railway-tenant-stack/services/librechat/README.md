# LibreChat

Open-source chat UI with custom endpoint support.

## Image

`ghcr.io/danny-avila/librechat:latest`

## Ports

- `3080` — Web UI

## Custom endpoint

LibreChat is configured to point its "Custom Endpoint" at the internal `agent` service URL:

```
CUSTOM_BASE_URL=http://agent.railway.internal:8000
```

## Environment

See `.env.example` for required variables.
