# n8n main

Main control-plane service for n8n queue mode.

## Role

- Serves n8n UI and REST API.
- Runs scheduler and enqueues jobs to Redis.
- Does not execute production jobs directly (`EXECUTIONS_MODE=queue`).

## Ports

- `5678` - n8n UI/API

## Runtime

- Image: `ghcr.io/levinnovation/agentyx-n8n:latest`
- Command: `n8n start`

## Notes

- Keep exactly one replica in Community Edition.
- `WEBHOOK_URL` must stay at the public tenant host (`https://{tenant}.n8n.agentyx.one`).
