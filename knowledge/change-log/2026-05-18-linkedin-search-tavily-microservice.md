# 2026-05-18 — Add LinkedIn Search via Tavily microservice sub-workflow

## Context

The Prospector Agent Core currently sources LinkedIn profiles via RapidAPI (`fresh-linkedin-profile-data`). To add a Tavily-powered search path that can be used as an alternative or supplement, a new reusable sub-workflow was created.

## Changes

### `tenants/levinnovation/assets/workflows/n8n/linkedin-search-tavily/linkedin-search-tavily.json`

New n8n workflow asset:

- **LinkedIn Search Webhook** (`n8n-nodes-base.webhook`) — POST at `/webhook/linkedin/search-tavily`
  - Input envelope: `{ query: string, limit?: number }`
  - `responseMode`: `responseNode`

- **Call Tavily API** (`n8n-nodes-base.httpRequest`)
  - Endpoint: `POST https://api.tavily.com/search`
  - Auth: `httpHeaderAuth` credential id `8UlHXKvhdd4luxVZ` (Tavily API Key)
  - Body: `{ query: "site:linkedin.com/in <input>", max_results: <limit || 25>, search_depth: "basic", include_answer: true }`
  - `continueOnFail: true`, timeout: `25000`

- **Parse LinkedIn Profiles** (`n8n-nodes-base.code`)
  - Parses Tavily `results` array
  - Extracts `name`, `title`, `company` from LinkedIn-style titles (`"First Last - Title at Company | LinkedIn"`)
  - Deduplicates by URL
  - Returns canonical profile array with `full_name`, `company`, `title`, `linkedin_url`, `location`, `summary`

- **Return Results** (`n8n-nodes-base.respondToWebhook`)
  - Output envelope: `{ data: Profile[], count: number, source: "tavily" }`

### Supporting files

- `asset.yaml` — registered under `sales/outbound-prospecting` capability
- `README.md` — input/output envelopes, webhook path, dependencies
- `.env.example` — no additional env vars (auth via n8n credential)

### `tenants/levinnovation/assets/workflows/n8n/prospector-agent-core/README.md`

- Added `LinkedIn Search via Tavily` to the subworkflows referenced table.

## Validation

- `make validate` passes (JSON syntax verified, asset.yaml valid)
- Workflow JSON is ready for import via n8n API:
  ```bash
  curl -X POST \
    -H "X-N8N-API-KEY: $N8N_KEY" \
    -H "Content-Type: application/json" \
    https://webhooks.n8n.agentyx.one/api/v1/workflows \
    -d @tenants/levinnovation/assets/workflows/n8n/linkedin-search-tavily/linkedin-search-tavily.json
  ```

## Follow-up

- After importing into n8n, record the assigned workflow ID in:
  - `prospector-agent-core/asset.yaml` under `spec.subworkflows`
  - `prospector-agent-core/README.md` subworkflows table
  - `linkedin-search-tavily/asset.yaml` under `spec.workflow_id` if a spec block is added
- Wire the Prospector Agent Core "Source LinkedIn" node to call this subworkflow via `Execute Workflow` or `HTTP Request` to the webhook URL.
