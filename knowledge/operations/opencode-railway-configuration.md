# OpenCode Configuration for Railway PaaS

**Date:** 2026-05-14  
**Status:** Active  
**Related:** ADR-0010 (Railway as canonical runtime)

---

## Overview

This document describes the OpenCode configuration for working with Railway PaaS deployments in the agentyx-vertical-assets repository.

## Components

### 1. Railway Skill

**Location:** `.opencode/skills/railway-deploy/SKILL.md`

A specialized skill that provides Railway-specific knowledge and workflows. The skill includes:

- Common Railway CLI commands and workflows
- Repository-specific Railway architecture (tenant projects, internal template)
- Troubleshooting guides for common Railway issues
- Best practices for Railway deployments
- Environment variables reference
- Links to relevant operational documentation

**Usage:**

When OpenCode needs to work with Railway deployments, it can load this skill using:

```
skill({ name: "railway-deploy" })
```

Or the user can request it explicitly:

```
Use the railway-deploy skill to help me deploy the new service
```

### 2. MCP Server Configuration

**Location:** `.opencode/opencode.json`

The OpenCode configuration includes:

#### Railway MCP (Local)

A local MCP server that wraps the Railway CLI, allowing OpenCode to execute Railway commands directly.

```json
{
  "railway": {
    "type": "local",
    "command": ["railway", "run"],
    "enabled": true,
    "environment": {
      "RAILWAY_TOKEN": "${RAILWAY_TOKEN}"
    }
  }
}
```

**Prerequisites:**
- Railway CLI must be installed: `brew install railway` (macOS) or see https://docs.railway.app/develop/cli
- RAILWAY_TOKEN environment variable must be set

#### Context7 MCP (Remote)

A remote MCP server for searching documentation, useful when working with Railway or other technologies.

```json
{
  "context7": {
    "type": "remote",
    "url": "https://mcp.context7.com/mcp",
    "enabled": true
  }
}
```

### 3. Tool Configuration

Skills and MCP tools are enabled for the general agent:

```json
{
  "tools": {
    "skill": true
  },
  "agent": {
    "general": {
      "tools": {
        "railway_*": true,
        "context7_*": true,
        "skill": true
      }
    }
  }
}
```

This ensures OpenCode can:
- Load skills on demand
- Use Railway CLI commands via MCP
- Search documentation when needed

## Workflows

### Deploy a new service

1. User requests a Railway deployment
2. OpenCode loads the `railway-deploy` skill for context
3. OpenCode uses Railway MCP tools to execute commands
4. OpenCode references repository-specific docs from `knowledge/operations/railway-*.md`

Example prompt:

```
I need to deploy the better-auth service to Railway for the euromobilia tenant.
Use the railway-deploy skill.
```

### Troubleshoot a deployment

1. User reports a deployment issue
2. OpenCode loads the `railway-deploy` skill
3. Skill provides troubleshooting guidance and common pitfalls
4. OpenCode checks logs using Railway MCP or suggests manual commands

Example prompt:

```
The flowise service won't start in Railway. Can you help debug this?
Use the railway-deploy skill.
```

### Generate railway.toml

1. User requests a Railway configuration file
2. OpenCode loads the `railway-deploy` skill
3. Skill provides repository patterns and best practices
4. OpenCode generates the file following repository conventions

Example prompt:

```
Create a railway.toml for the new composio-mcp service.
Use the railway-deploy skill.
```

## Authentication

### Railway Token

The Railway CLI uses the `RAILWAY_TOKEN` environment variable for authentication.

**To set up:**

```bash
# Login via browser (stores token in Railway CLI config)
railway login

# Or use a token directly
export RAILWAY_TOKEN=your-token-here
```

**To rotate tokens:** See `knowledge/operations/how-to-rotate-railway-token.md`

### Context7 API Key (Optional)

Context7 works without authentication but offers higher rate limits with an API key.

To add an API key, update `.opencode/opencode.json`:

```json
{
  "context7": {
    "type": "remote",
    "url": "https://mcp.context7.com/mcp",
    "headers": {
      "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"
    }
  }
}
```

## Verification

### Test Railway MCP

```bash
# Ensure Railway CLI is installed
railway --version

# Ensure you're logged in
railway whoami

# Test with OpenCode
opencode
> use railway tools to show my projects
```

### Test Railway Skill

```bash
opencode
> load the railway-deploy skill and summarize what you can do
```

### Test Context7 MCP

```bash
opencode
> use context7 to search for Railway deployment best practices
```

## Troubleshooting

### Railway MCP not working

1. Verify Railway CLI is installed: `which railway`
2. Check authentication: `railway whoami`
3. Verify RAILWAY_TOKEN is set (if using token auth): `echo $RAILWAY_TOKEN`
4. Check OpenCode config: `cat .opencode/opencode.json`

### Skill not loading

1. Verify file exists: `ls .opencode/skills/railway-deploy/SKILL.md`
2. Check frontmatter is valid YAML
3. Ensure `name` in frontmatter matches directory name
4. Restart OpenCode after adding the skill

### Context7 rate limited

1. Sign up for free Context7 account
2. Get API key from dashboard
3. Add to `.opencode/opencode.json` as shown above
4. Set `CONTEXT7_API_KEY` environment variable

## Maintenance

### When to update

Update the Railway skill or MCP configuration when:

1. **New Railway features** - Add to skill documentation
2. **Repository patterns change** - Update skill best practices
3. **New operational docs** - Reference them in the skill
4. **Authentication changes** - Update MCP environment variables

### How to update

1. Edit `.opencode/skills/railway-deploy/SKILL.md`
2. Or edit `.opencode/opencode.json`
3. Test changes with OpenCode
4. Commit to repository
5. Document significant changes in `knowledge/change-log/`

## Related Documentation

- **Railway Operations:** `knowledge/operations/railway-*.md`
- **Railway Decisions:** `knowledge/decisions/0010-per-tenant-railway-project-as-canonical-runtime.md`
- **OpenCode Skills:** https://opencode.ai/docs/skills
- **OpenCode MCP:** https://opencode.ai/docs/mcp-servers
- **Railway CLI:** https://docs.railway.app/develop/cli

---

*Created: 2026-05-14*  
*Last updated: 2026-05-14*
