# LinkedIn Search via Tavily (Levinnovation)

Microservice sub-workflow for LinkedIn profile discovery using the Tavily search API.

## Input envelope

Called via webhook POST or `executeWorkflow`:

- `query` — search query string (e.g., `"operations manager AI automation"`)
- `limit` — max results to return from Tavily (default: 25)

## Output envelope

Returns JSON:

- `data` — array of parsed LinkedIn profiles:
  - `full_name`
  - `company`
  - `title`
  - `linkedin_url`
  - `location` (empty, reserved for future enrichment)
  - `summary` (first 300 chars of Tavily result content/title)
- `count` — number of profiles found
- `source` — `"tavily"`

## Nodes

1. **LinkedIn Search Webhook** — receives POST with `{ query, limit }`
2. **Call Tavily API** — searches `site:linkedin.com/in <query>` via Tavily
3. **Parse LinkedIn Profiles** — extracts name, title, company from result titles
4. **Return Results** — responds to caller with parsed profiles

## Webhook path

`POST /webhook/linkedin/search-tavily`

## Dependencies

- Tavily API Key credential (`httpHeaderAuth`, id: `8UlHXKvhdd4luxVZ`)

## Related workflows

- `prospector-agent-core` — main workflow that calls this sub-workflow
