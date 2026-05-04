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

## Environment

See `.env.example` for required variables.
