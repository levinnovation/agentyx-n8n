---
name: railway-deploy
description: Deploy and manage services on Railway PaaS platform
license: MIT
compatibility: opencode
metadata:
  audience: developers, devops
  workflow: railway
---

## What I do

I help you deploy and manage services on the Railway PaaS platform. I can:

- Deploy new services from GitHub repositories to Railway
- Manage Railway projects and environments
- Configure service variables and secrets
- Set up custom domains for services
- Monitor deployment status and logs
- Troubleshoot common Railway issues
- Generate railway.toml configuration files
- Manage Railway tokens and authentication

## When to use me

Use this skill when you need to:

1. **Deploy a new service** - Setting up a new service from a GitHub repo
2. **Configure deployments** - Adding environment variables, secrets, or custom domains
3. **Troubleshoot deployments** - Investigating failed deploys or service issues
4. **Manage Railway projects** - Creating, updating, or removing Railway projects
5. **Generate configs** - Creating or updating railway.toml configuration files

## Repository context

This repository uses Railway as the canonical runtime for all tenant deployments. Key facts:

- **Internal template**: We maintain a private Railway template based on `client-demo-agentyx`
- **Per-tenant projects**: Each tenant gets their own Railway project
- **Multi-service stack**: Postgres, MongoDB, n8n, LibreChat, better-auth, auth-proxy, portal, paperclip, flowise
- **Custom domains**: All services use custom subdomains under `agentyx.one`

## Common workflows

### 1. Deploy a new service

```bash
# Login to Railway
railway login

# Link to project
railway link [project-id]

# Set service context
railway service

# Deploy
railway up
```

### 2. Check deployment status

```bash
# View recent deployments
railway status

# View service logs
railway logs

# View environment variables
railway variables
```

### 3. Add environment variables

```bash
# Set a single variable
railway variables set KEY=value

# Set from .env file
railway variables set --env-file .env
```

### 4. Add custom domain

```bash
# Via CLI
railway domain

# Or configure in railway.toml
```

## Repository-specific files

When working with this repository, be aware of:

- `railway.toml` - Top-level Railway config (if present)
- `services/*/railway.toml` - Per-service Railway configs
- `tenants/*/assets/deploy/railway/railway.toml` - Tenant-specific configs
- `templates/assets/railway-tenant-stack/` - Template configuration
- `scripts/railway/` - Railway automation scripts
- `knowledge/operations/railway-*.md` - Railway operational docs

## Key operational docs

Before making Railway changes, consult:

1. `knowledge/operations/railway-internal-template.md` - Template usage
2. `knowledge/operations/railway-dashboard-setup-guide.md` - Setup guide
3. `knowledge/operations/railway-template-sources.md` - Template sources
4. `knowledge/decisions/0010-per-tenant-railway-project-as-canonical-runtime.md` - Architecture decision

## Common pitfalls

- **Private repos**: Ensure Railway has access to `levinnovation/*` repos
- **Branch names**: Verify exact branch names (e.g., `master` for n8n, `agentyx/main` for forks)
- **Dockerfile paths**: Check root directory and Dockerfile paths in service config
- **Secrets sync**: Some secrets must match across services (e.g., `TRUSTED_PROXY_SECRET`)
- **Domain propagation**: Custom domains can take 5-15 minutes to propagate

## Best practices

1. **Always validate** railway.toml files before committing
2. **Use internal URLs** for service-to-service communication (*.railway.internal)
3. **Reference secrets** using Railway template functions when possible (e.g., `${{secret(64)}}`)
4. **Document changes** in `knowledge/change-log/` after significant Railway changes
5. **Test locally** before deploying to production environments

## CLI cheatsheet

```bash
# Authentication
railway login                    # Login via browser
railway login --browserless      # Login with token
railway logout                   # Logout

# Project management
railway init                     # Create/link project
railway link [project-id]        # Link to existing project
railway unlink                   # Unlink project

# Service management
railway service                  # Select service
railway up                       # Deploy current directory
railway up --detach             # Deploy without logs

# Variables
railway variables                # List all variables
railway variables set KEY=VALUE  # Set variable
railway variables delete KEY     # Delete variable

# Logs and status
railway logs                     # Tail service logs
railway logs --deployment [id]  # View specific deployment logs
railway status                   # View project status

# Domains
railway domain                   # Manage domains

# Other
railway run [command]            # Run command with Railway env
railway open                     # Open Railway dashboard
```

## Environment variables reference

Common environment variables used across Railway services:

```bash
# Railway-provided
RAILWAY_ENVIRONMENT              # Environment name (e.g., production)
RAILWAY_PROJECT_ID               # Unique project ID
RAILWAY_SERVICE_ID               # Unique service ID
RAILWAY_PUBLIC_DOMAIN            # Auto-generated public domain
RAILWAY_PRIVATE_DOMAIN           # Internal .railway.internal domain

# Cross-service references
${{Postgres.DATABASE_URL}}       # Reference Postgres URL
${{Postgres.PGHOST}}             # Reference Postgres host
${{MongoDB.MONGO_URL}}           # Reference MongoDB URL

# Secret generation
${{secret(32)}}                  # Generate 32-char secret
${{secret(64)}}                  # Generate 64-char secret
```

## Troubleshooting guide

### Build failures

1. Check build logs: `railway logs --deployment [id]`
2. Verify Dockerfile path in railway.toml
3. Ensure all dependencies are specified
4. Check branch name matches repository

### Service won't start

1. Check environment variables: `railway variables`
2. Verify internal service URLs use `.railway.internal`
3. Check for missing required secrets
4. Review service logs: `railway logs`

### Domain not working

1. Verify DNS CNAME points to `*.up.railway.app`
2. Wait 5-15 minutes for propagation
3. Check domain status in Railway dashboard
4. Ensure SSL certificate is issued

### Authentication issues

1. Check Railway token: `railway whoami`
2. Re-authenticate: `railway login`
3. Verify workspace access
4. Check RAILWAY_TOKEN environment variable

## Related commands

After making Railway changes, remember to:

```bash
# Validate repository
make validate

# Update knowledge index (if docs changed)
make knowledge-index

# Commit changes
git add .
git commit -m "feat: update Railway configuration"
```

## Getting help

- Railway docs: https://docs.railway.app
- Railway CLI: https://docs.railway.app/develop/cli
- Repository knowledge: `knowledge/operations/railway-*.md`
- Team workspace: https://railway.app/workspace
