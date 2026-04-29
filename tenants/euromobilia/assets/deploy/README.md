# Deployment Assets

Multi-target deployment manifests for the kitchen-quotation capability.

## Hostinger VPS (187.127.252.161 / srv1616787.hstgr.cloud)

| Asset | Description | Status |
|-------|-------------|--------|
| **`n8n-hostinger/`** | Caddy unified ingress + n8n CE + Postgres | Active |
| **`agent-hostinger/`** | Quotation Assistant FastAPI agent (Docker) | Active |

### Ingress routing (Caddy)

```
http://srv1616787.hstgr.cloud/
  /agent/*  → quotation-assistant (port 8000)
  /         → n8n (port 5678)
```

The agent container is deployed separately but connected to the `n8n_default`
Docker network so Caddy can resolve it by container name.

### Network connectivity

```bash
# Connect agent to n8n network (required after first agent deploy)
docker network connect n8n_default euromobilia-agent-agent-1
```

## Other platforms

Other files in this directory (Render, Railway, Fly, Cloud Run) are
legacy/scaffold manifests and are not validated as separate asset subfolders
until moved under a named asset directory.
