# Euromobilia Quotation Assistant — Hostinger Deploy

This directory contains the **deployment artifacts** for running the
quotation-assistant FastAPI agent on the Hostinger VPS.

## Relationship to other deploy assets

- **n8n-hostinger** (`../n8n-hostinger/`) — Caddy reverse proxy + n8n CE.
  Caddy routes `/agent/*` to this agent container by Docker network name.
- **agent-hostinger** (this directory) — The agent runtime itself.

## First-time setup on VPS

```bash
# 1. Create directory and copy files
mkdir -p /opt/euromobilia-agent
cd /opt/euromobilia-agent

# 2. Copy agent source code from repo
# (tar/SCP from tenants/euromobilia/assets/agents/quotation-assistant/)

# 3. Create .env
cp .env.example .env
# Edit .env and fill in all secrets

# 4. Build and start
docker compose up -d --build

# 5. Connect to n8n network so Caddy can reach it
docker network connect n8n_default euromobilia-agent-agent-1
```

## Health Check

```bash
# Internal (Docker network)
curl http://localhost:8000/health

# External (via Caddy)
curl http://187.127.252.161/agent/health
```
