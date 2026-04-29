# Legacy Inventory: AUREA → Euromobilia Kitchen Commerce

## Overview

This document maps every significant file from the legacy `aurea-aragroupcr/` repository to its new home under `tenants/euromobilia/`. The migration re-platforms the backend from Modal + CopilotKit AG-UI to LangGraph + FastAPI, with **Kapso WhatsApp** as the **first** channel asset wired for ingress—not the only allowed interface (see ADR-0007: multi-interface deployment).

## Detected frameworks & runtime

| Framework | Legacy usage | New runtime |
|-----------|--------------|-------------|
| Modal | `@modal.fastapi_endpoint`, `@modal.cron`, Modal Volume | **Dropped** — replaced with Render/FastAPI |
| CopilotKit | React UI ↔ Modal AG-UI bridge | **Dropped** — not in scope |
| React/Vite | Frontend UI (`src/components`, `src/pages`) | **Dropped** — not in scope |
| LangGraph | `agent.py`, `graph.py` | **Retained** — ported to `quotation-assistant` |
| Supabase | Products, prices, documents, chat sessions | **Retained** — ported to `infra/supabase` |
| OpenRouter | Primary + free-fallback LLM routing | **Retained** — ported to `config.py` |
| Tavily | Web search | **Retained** — ported to `tools/web_search.py` |
| Pollinations | Image generation fallback | **Retained** — ported to `tools/image_gen.py` |
| FAISS | Vector store for documents | **Retained** — ported to `knowledge/vector_store.py` |

## Environment variables

| Variable | Legacy | New |
|----------|--------|-----|
| `SUPABASE_URL` | Used in `config.py` | Used in `config.py` |
| `SUPABASE_SERVICE_ROLE_KEY` | Used in `config.py` | Used in `config.py` |
| `OPENAI_API_KEY` | Used in `config.py` | Used in `config.py` |
| `OPENROUTER_API_KEY` | Used in `config.py` | Used in `config.py` |
| `LANGCHAIN_API_KEY` | Used in `config.py` | Used in `config.py` |
| `TAVILY_API_KEY` | Used in `config.py` | Used in `config.py` |
| `REPLICATE_API_TOKEN` | Used in `tools/image_gen.py` | Used in `tools/image_gen.py` |
| `KAPSO_API_KEY` | **New** | `config.py` / `kapso.py` |
| `KAPSO_WEBHOOK_SECRET` | **New** | `main.py` webhook validation |
| `BITRIX24_WEBHOOK_URL` | **New** | `bitrix24-bridge` edge function |
| `SLACK_WEBHOOK_URL` | **New** | Slack integration contract |
| `COMPOSIO_API_KEY` | **New** | Composio integration contract |

## Endpoints

| Legacy endpoint | Purpose | New endpoint |
|-----------------|---------|--------------|
| `modal-knowledge-base/app.py` `@modal.fastapi_endpoint` | Modal ASGI app | **Dropped** |
| `modal-knowledge-base/agui_endpoint.py` | CopilotKit AG-UI bridge | **Dropped** |
| `server/index.ts` | CopilotKit ↔ Modal proxy | **Dropped** |
| `supabase/functions/chat-with-aurea/index.ts` | UI-coupled chat | **Deprecated** |
| — | WhatsApp inbound webhook | `POST /webhooks/kapso/inbound` (new) |
| — | Agent invoke | `POST /agent/invoke` (new) |
| — | Health check | `GET /health` (new) |
| — | Graph info | `GET /graph/info` (new) |

## Prompts

| Legacy file | Size | New location | Note |
|-------------|------|--------------|------|
| `modal-knowledge-base/agent_prompt.py` | ~31 KB | `assets/prompts/quotation-assistant.system.md` | Consolidated + versioned |
| `src/lib/system-prompt.ts` | ~40 KB | `assets/prompts/quotation-assistant.system.md` | Merged with above |
| `modal-knowledge-base/intake_form.py` | ~20 KB | `assets/prompts/intent-router.system.md` + `quote-consolidation.system.md` | Split by concern |
| — | — | `assets/prompts/image-description.system.md` | New (image gen subagent) |

## Tools

| Legacy file | New location | Status |
|-------------|--------------|--------|
| `tools/catalog_search.py` | `app/tools/catalog_search.py` | Ported |
| `tools/document_search.py` | `app/tools/document_search.py` | Ported |
| `tools/nomenclature.py` | `app/tools/nomenclature.py` | Ported |
| `tools/web_search.py` | `app/tools/web_search.py` | Ported |
| `tools/image_gen.py` | `app/tools/image_gen.py` | Ported (43 KB logic flagged for review) |
| `tools/product_image.py` | `app/tools/product_image.py` | Ported |
| `tools/quote_pdf.py` | `app/tools/quote_pdf.py` | Ported |

## Data models

| Legacy file | New location | Note |
|-------------|--------------|------|
| `scripts/setup-catalog-tables.sql` | `infra/supabase/schema.sql` (catalog section) | Consolidated |
| `scripts/setup-chat-tables.sql` | `infra/supabase/schema.sql` (chat section) | Consolidated |
| `supabase/migrations/20260213_*` | `infra/supabase/migrations/0001_*`, `0002_*` | Verbatim |
| `src/lib/supabase-catalog*.ts` | Reference only | Python tools are canonical |
| `src/lib/pdf-quotation.ts` | Reference for `functions/quote-pdf/index.ts` | Edge function port |

## Workflows

| Legacy | New | Status |
|--------|-----|--------|
| — | `workflows/n8n/kapso-inbound-quotation.json` | New scaffold |
| — | `workflows/n8n/kb-ingest.json` | New scaffold |
| — | `workflows/n8n/human-handoff.json` | New scaffold |
| — | `workflows/n8n/quote-document-generation.json` | New scaffold |

## Knowledge / RAG

| Legacy file | New location | Status |
|-------------|--------------|--------|
| `knowledge/sync.py` | `app/knowledge/sync.py` | Ported |
| `knowledge/vector_store.py` | `app/knowledge/vector_store.py` | Ported |
| `knowledge/keyword_map.py` | `app/knowledge/keyword_map.py` | Ported |

## Deployment files

| Legacy | New | Note |
|--------|-----|------|
| `modal-knowledge-base/requirements.txt` | `pyproject.toml` | Modern Python packaging |
| `modal-knowledge-base/langgraph.json` | `langgraph.json` | LangGraph Cloud parity |
| `Dockerfile` (legacy root) | `Dockerfile` | Python 3.11 slim, uvicorn |
| `deploy-azure.ps1`, `deploy-gpu-vm.ps1` | **Dropped** | Not in scope |
| `vercel.json` | **Dropped** | Frontend only |

## Tests

| Legacy | New | Note |
|--------|-----|------|
| `vitest.config.ts` | **Dropped** | Frontend only |
| — | `assets/evals/*.eval.yaml` | New policy evals |
| — | `capabilities/kitchen-quotation/tests.yaml` | Capability test manifest |

## Mapping summary

| Category | Legacy files | Migrated | Reimplemented | Stubbed | Dropped |
|----------|--------------|----------|---------------|---------|---------|
| Agent runtime | 6 | 4 | 2 | 0 | 0 |
| Tools | 7 | 7 | 0 | 0 | 0 |
| Prompts | 3 | 3 | 1 | 0 | 0 |
| Knowledge | 3 | 3 | 0 | 0 | 0 |
| Supabase schema | 5 | 5 | 0 | 0 | 0 |
| Supabase functions | 1 | 0 | 2 | 0 | 1 |
| n8n workflows | 0 | 0 | 0 | 4 | 0 |
| Integrations | 0 | 0 | 0 | 5 | 0 |
| Channel | 0 | 0 | 0 | 1 | 0 |
| Frontend | ~40 | 0 | 0 | 0 | ~40 |
| Deployment | 5 | 3 | 0 | 0 | 2 |

## Risks & manual steps

1. **Image generation logic** (`tools/image_gen.py`) is structurally ported but contains 43 KB of Pollinations prompt construction. Flagged for runtime review.
2. **Kapso channel**, **n8n workflows**, **Bitrix24/Slack/Composio/OpenRouter/Kapso integrations** are scaffolded contracts, not production implementations. They require manual credential setup and runtime validation.
3. **No secrets committed** — all env-var values remain in `.env` and `.env.example`.
4. **Evals** are static YAML policy assertions; they need an external runner.
5. **Frontend (React/Vite)** is not migrated. The **repository** architecture supports **many** customer/operator interfaces via channel assets; Kapso WhatsApp is the first wired surface, not the product definition.

## Cross-reference: TypeScript → Python

See `assets/agents/quotation-assistant/docs/legacy-typescript-mapping.md` for the detailed cross-reference of legacy TypeScript business logic to new Python implementations.

