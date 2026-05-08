# Redis (n8n queue)

Redis service used by n8n queue mode as Bull backend.

## Role

- Stores pending jobs and worker coordination state.
- Shared by `n8n-main`, `n8n-worker`, and `n8n-webhook`.

## Ports

- `6379` - Redis TCP (private networking only)

## Runtime

- Image: `redis:7-alpine`
- Suggested command: `redis-server --appendonly yes --requirepass $REDIS_PASSWORD`
