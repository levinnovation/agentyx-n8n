# Agentyx CRM Update (Twenty)

Create or update People, Companies, and Opportunities in Twenty CRM.

## What it replaces

Replaces `twenty-crm-write-actions` and `twenty-crm-on-update-interactions` workflows with manual HTTP Request nodes for:
- Creating/updating people
- Creating/updating companies
- Creating/updating opportunities
- Linking people to companies

## Operations

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create Person | POST | `/people` |
| Update Person | PATCH | `/people/{id}` |
| Create Company | POST | `/companies` |
| Update Company | PATCH | `/companies/{id}` |
| Create Opportunity | POST | `/opportunities` |
| Update Opportunity | PATCH | `/opportunities/{id}` |
| Link Person to Company | PATCH | `/people/{id}` (payload.companyId) |

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Operation | options | `createPerson` | CRUD operation |
| Record ID | string | "" | Required for updates |
| Payload (JSON) | json | `{}` | Fields to create/update |
| Base URL | string | `https://levinnovation.crm.agentyx.one/rest` | Twenty REST endpoint |
| Timeout | number | 15000 | Request timeout |

## Credentials

- **Twenty CRM API** (`twentyCrmApi`) — Required

## Output

```json
{
  "data": { "id": "...", ... },
  "operation": "createPerson",
  "id": "...",
  "success": true,
  "url": "https://.../rest/people",
  "method": "POST",
  "metadata": { "timestamp": "..." }
}
```

## Usage in SDLC

Use this node for all Twenty CRM write operations. It ensures consistent URL patterns, auth headers, and validation.

## References

- `knowledge/context-packs/n8n-sdk-context.md`
- `standards/policies/n8n-node-policy.md`
