# Redis (levinnovation n8n queue)

Redis service used by LEV Innovation n8n queue-mode cluster.

- Stores Bull queue jobs and coordination state.
- Shared by `n8n-main`, `n8n-worker`, and `n8n-webhook`.
