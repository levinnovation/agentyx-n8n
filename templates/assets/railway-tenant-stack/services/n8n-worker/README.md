# n8n worker

Execution-plane service for n8n queue mode.

## Role

- Consumes execution jobs from Redis Bull queue.
- Runs workflow executions outside the main process.
- Scales horizontally for throughput and resilience.

## Ports

- `5678` - process port (private networking only)

## Runtime

- Image: `ghcr.io/levinnovation/agentyx-n8n:latest`
- Command: `n8n worker`

## Sizing

- Default template target: `3` replicas.
