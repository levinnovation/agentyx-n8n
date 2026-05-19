# Customer Service Core v2

Migrated version of customer-service-core using Agentyx community nodes.

## Changes from v1

| v1 Pattern | v2 Replacement |
|-----------|---------------|
| AI Agent + OpenRouter + Redis combo | AgentyxAIAgentBasicNode |
| Manual HTTP Request CRM queries | AgentyxCRMQuery |

## Nodes Used

- `AgentyxTenantContext`
- `AgentyxAIAgentBasicNode`
- `AgentyxCRMQuery`

## Testing

Call via `chan-kapso-wa-customer-service-v2` or test directly with Execute Workflow Trigger.

## Deployment

```bash
agentyx n8n compile --tenant levinnovation --asset customer-service-core-v2
agentyx n8n deploy --tenant levinnovation --env dev --asset customer-service-core-v2
```
