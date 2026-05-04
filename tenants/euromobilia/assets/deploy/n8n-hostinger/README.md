> **DEPRECATED** — This Hostinger deploy is superseded by the Railway tenant stack (`euromobilia-railway-stack`). See ADR-0010: `knowledge/decisions/0010-per-tenant-railway-project-as-canonical-runtime.md`. Retained for emergency rollback only.

# n8n Community Edition — Hostinger VPS

Self-hosted **n8n CE** for Euromobilia `kitchen-quotation` workflows. **Git remains the source of truth** for workflow JSON; this stack is the runtime.

| Item | Value |
|------|--------|
| VPS IP (bootstrap) | `187.127.252.161` |
| Hostinger hostname | `srv1616787.hstgr.cloud` (use for DNS/SSH labels; HTTP bootstrap targets IP) |
| Public URL (bootstrap) | `http://187.127.252.161/` (port **80** → Caddy → n8n) |

## Security warnings

1. **HTTP + IP** is acceptable only for **bootstrap**. Move to **HTTPS + a real domain** before production webhooks and operator login from untrusted networks.
2. **Never commit** `.env`, private SSH keys, or `N8N_ENCRYPTION_KEY` to this repo.
3. If a private key was ever exposed in chat, **rotate** the key pair (see [LOCAL-SSH-SETUP.md](LOCAL-SSH-SETUP.md)).

## Community Edition expectations

n8n CE does **not** include enterprise features such as Git-based source control inside n8n, external secrets, SSO, projects, or log streaming. **Version workflows in Git** and import/export through the editor or API as documented in `tenants/euromobilia/assets/workflows/n8n/README.md`.

Optional **Registered Community Edition** unlocks (folders, debug-in-editor, custom execution metadata) per [n8n docs](https://docs.n8n.io/hosting/community-edition-features/) — configure in-app under Settings → Usage and plan.

## Prerequisites (VPS)

- Ubuntu/Debian-style VPS with root or sudo SSH access.
- Open ports: **22** (SSH), **80** (HTTP). Open **443** when you add TLS.
- Docker Engine + Docker Compose plugin v2.

Example (Debian/Ubuntu; verify against current Docker docs):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
# add Docker apt repo per https://docs.docker.com/engine/install/
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

## Deploy

1. Copy this directory to the server, e.g. `/opt/agentyx/n8n-hostinger/`.
2. On the server:

   ```bash
   cd /opt/agentyx/n8n-hostinger
   cp .env.example .env
   # edit .env: set POSTGRES_PASSWORD, N8N_ENCRYPTION_KEY (openssl rand -hex 32), and URLs if IP changes
   docker compose up -d
   ```

3. Open `http://187.127.252.161/` and complete the **owner** setup wizard.

## Backups

- **Postgres:** snapshot volume `postgres_data` (e.g. `docker run --rm -v n8n-hostinger_postgres_data:/v -v $(pwd):/backup alpine tar czf /backup/postgres_data.tgz -C /v .`) on a schedule.
- **n8n local data:** volume `n8n_data` (credentials encryption metadata, etc.) — backup similarly.
- **Workflows:** always restore from **this repository** JSON under `tenants/euromobilia/assets/workflows/n8n/`.

## Updates and rollback

```bash
cd /opt/agentyx/n8n-hostinger
docker compose pull
docker compose up -d
```

Rollback: pin `image:` digest in `docker-compose.yml` or restore Postgres volume from backup, then `docker compose up -d`.

## Workflow import (from repo)

See [../../workflows/n8n/README.md](../../workflows/n8n/README.md) for import order and environment variables expected inside n8n.

## Files in this asset

| File | Purpose |
|------|---------|
| `docker-compose.yml` | n8n + Postgres + Caddy |
| `Caddyfile` | Reverse proxy on `:80` |
| `.env.example` | Variable names only (no secrets) |
| `LOCAL-SSH-SETUP.md` | SSH key handling (local machine, not in Git secrets) |
