# n8n webhook

Dedicated webhook ingress service for n8n queue mode.

## Role

- Handles incoming webhook and form endpoints.
- Enqueues matching executions into Redis.
- Isolated from UI restarts to reduce dropped webhooks.

## Ports

- `5678` - webhook listener (private networking only)

## Runtime

- Image: `ghcr.io/levinnovation/agentyx-n8n:latest`
- Command: `n8n webhook`

## Sizing

- Default template target: `2` replicas.
