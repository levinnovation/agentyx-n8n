# Kitchen Quotation — Deployment Guide

## Prerequisites

- Python 3.11+
- Docker (optional)
- Supabase project with service role key
- OpenRouter API key (or OpenAI API key)
- Kapso API credentials
- LangSmith API key (optional, for tracing)

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

## Production Deployment (Render)

1. Push code to GitHub.
2. Create a new Web Service on Render.
3. Set environment variables from `.env.example`.
4. Build command: `pip install -e .`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

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
- Render dashboards: logs + metrics
- Supabase logs: edge functions + database
