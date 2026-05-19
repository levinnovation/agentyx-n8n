# Agentyx CRM Query (Twenty)

Read-only queries against Twenty CRM.

## What it replaces

Replaces `twenty-crm-read-context` workflow and manual HTTP Request nodes for:
- Searching people by email/name
- Searching companies by name
- Searching opportunities by name
- Listing recent records

## Operations

| Operation | Description |
|-----------|-------------|
| Search People by Email | `GET /people?filter=emails.primaryEmail[eq]:{email}` |
| Search People by Name | `GET /people?filter=name[like]:{name}` |
| Search Companies by Name | `GET /companies?filter=name[eq]:{name}` |
| Search Opportunities by Name | `GET /opportunities?filter=name[eq]:{name}` |
| Get Person by ID | `GET /people/{id}` |
| Get Company by ID | `GET /companies/{id}` |
| Get Opportunity by ID | `GET /opportunities/{id}` |
| List People | `GET /people?limit={n}` |
| List Companies | `GET /companies?limit={n}` |
| List Opportunities | `GET /opportunities?limit={n}` |

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Operation | options | `searchPeopleByEmail` | Query type |
| Query / ID | string | expression | Search term or record ID |
| Limit | number | 10 | Max records |
| Base URL | string | `https://levinnovation.crm.agentyx.one/rest` | Twenty REST endpoint |
| Timeout | number | 15000 | Request timeout |

## Credentials

- **Twenty CRM API** (`twentyCrmApi`) — Required

## Output

```json
{
  "data": [...],
  "operation": "searchPeopleByEmail",
  "query": "john@example.com",
  "url": "https://.../rest/people?filter=...",
  "count": 1,
  "metadata": { "timestamp": "..." }
}
```

## Usage in SDLC

Use this node for all Twenty CRM read operations. It centralizes URL construction, auth, and error handling.

## References

- `knowledge/context-packs/n8n-sdk-context.md`
- `standards/policies/n8n-node-policy.md`
