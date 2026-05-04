# Kitchen Quotation — Deployment Guide

> **Canonical platform:** Railway (ADR-0010). Hostinger is deprecated and retained for emergency rollback only.

## Prerequisites

- Python 3.11+ (local dev)
- Docker (optional)
- Supabase project with service role key
- OpenRouter API key (or OpenAI API key)
- Kapso API credentials
- LangSmith API key (optional, for tracing)
- Railway CLI installed locally (`curl -fsSL https://railway.app/install.sh | sh`)
- `RAILWAY_TOKEN` exported (project-scoped preferred)

## Local Development

1. Install dependencies:
   ```bash
   cd tenants/euromobilia/assets/agents/quotation-assistant
   pip install -e .
   ```

2. Copy `.env.example` to `.env` and fill in values.

3. Run the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

4. Run LangGraph dev:
   ```bash
   langgraph dev
   ```

## Production Deployment (Railway)

### Bootstrap (one-time)

```bash
export RAILWAY_TOKEN=<token>
bash scripts/railway/bootstrap-tenant.sh --tenant euromobilia
```

This creates the Railway project, adds Postgres, creates all services, and syncs variables.

Save the returned **Project ID** as the GitHub variable `EUROMOBILIA_RAILWAY_PROJECT_ID`.

### Agent deploy (CI)

Push to `main` touching:
- `tenants/euromobilia/assets/agents/quotation-assistant/**`
- `tenants/euromobilia/assets/prompts/**`
- `tenants/euromobilia/assets/deploy/railway/services/agent/**`

The workflow:
1. Builds GHCR image: `ghcr.io/<org>/euromobilia-agent-quotation-assistant:<sha>`
2. Calls `_reusable/railway-deploy.yml` → sets `AGENT_IMAGE` → redeploys the `agent` service
3. Runs smoke tests (`/health`)

### Stack service deploy (CI)

Push to `main` touching `tenants/euromobilia/assets/deploy/railway/**`.

The workflow diffs which service folders changed and redeploys only those services.

### Manual deploy (operator)

```bash
export RAILWAY_TOKEN=<token>
bash scripts/railway/deploy-service.sh --tenant euromobilia --service agent --image <ghcr-image-ref>
```

## n8n Workflows

Import the JSON scaffolds from `assets/workflows/n8n/` into your n8n instance.
Credential placeholders must be configured manually.

## Supabase

Apply migrations in order:
1. `schema.sql`
2. `migrations/0001_commercial_pricing_rules.sql`
3. `migrations/0002_app_settings.sql`
4. `policies.sql`
5. `storage.sql`

Deploy edge functions:
```bash
supabase functions deploy quote-pdf
supabase functions deploy bitrix24-bridge
```

## Monitoring

- LangSmith: https://smith.langchain.com
- Langfuse: public domain of the `langfuse` Railway service
- Railway dashboards: logs + metrics per service
- Supabase logs: edge functions + database

## Legacy Deployment (Hostinger — deprecated)

See `tenants/euromobilia/assets/deploy/n8n-hostinger/` and `agent-hostinger/`.
These are retained for emergency rollback only (ADR-0010).
