# Demo: Agentyx Custom Community Nodes

This workflow demonstrates all 6 Agentyx custom n8n community nodes working together.

## Workflow Flow

1. **Webhook Trigger** — Receives POST at `/demo-agentyx-nodes`
2. **Channel Input** — Normalizes any incoming payload into canonical envelope
3. **AI Agent** — Calls OpenRouter GPT-4o-mini with system prompt
4. **Channel Output** — Formats reply as generic payload
5. **Respond** — Returns JSON response to webhook caller

## Testing

```bash
curl -X POST https://levinnovation.n8n.agentyx.one/webhook/demo-agentyx-nodes \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me?", "user_id": "+1234567890"}'
```

## Nodes Used

- `AgentyxChannelFormattedInputNode`
- `AgentyxAIAgentBasicNode`
- `AgentyxChannelFormattedOutputNode`

## Deployment

```bash
agentyx n8n compile --tenant levinnovation --asset demo-agentyx-nodes
agentyx n8n deploy --tenant levinnovation --env dev --asset demo-agentyx-nodes
```
