# OpenCode Railway Integration - Skills and MCP

**Date:** 2026-05-14  
**Type:** Enhancement  
**Impact:** Developer tooling

---

## Summary

Added OpenCode skill and MCP configuration for Railway PaaS management.

## Changes

### 1. Railway Deploy Skill

**Created:** `.opencode/skills/railway-deploy/SKILL.md`

A comprehensive skill that provides:
- Railway CLI command reference and workflows
- Repository-specific Railway architecture knowledge
- Troubleshooting guides for common issues
- Best practices for Railway deployments in this repo
- Links to operational documentation

The skill helps OpenCode understand:
- Our per-tenant Railway project architecture
- The internal Railway template system
- Service configuration patterns
- Common pitfalls and solutions

### 2. OpenCode MCP Configuration

**Created:** `.opencode/opencode.json`

Configured two MCP servers:

**Railway MCP (local):**
- Wraps the Railway CLI for direct command execution
- Requires Railway CLI installation and authentication
- Uses RAILWAY_TOKEN environment variable

**Context7 MCP (remote):**
- Provides documentation search capabilities
- Helpful when working with Railway or other technologies
- Optional API key for higher rate limits

### 3. Tool Configuration

Enabled skills and MCP tools for the general agent:
- `skill` tool enabled globally
- `railway_*` tools enabled for general agent
- `context7_*` tools enabled for general agent

### 4. Documentation

**Created:** `knowledge/operations/opencode-railway-configuration.md`

Comprehensive guide covering:
- Component overview (skill, MCP servers, tools)
- Common workflows (deploy, troubleshoot, generate configs)
- Authentication setup
- Verification steps
- Troubleshooting guide
- Maintenance instructions

## Benefits

1. **Context-aware Railway operations** - OpenCode can load Railway-specific knowledge on demand
2. **CLI integration** - Direct Railway command execution through MCP
3. **Documentation search** - Quick lookup of Railway best practices via Context7
4. **Repository awareness** - Skill includes our specific Railway architecture (templates, tenants, services)
5. **Troubleshooting help** - Common issues and solutions readily available

## Usage

### Load Railway skill

```
Use the railway-deploy skill to help me with Railway deployments
```

### Execute Railway commands

```
Use railway tools to list my projects
```

### Search Railway docs

```
Use context7 to find Railway environment variable best practices
```

## Prerequisites

For developers to use these features:

1. **Railway CLI** - Install via `brew install railway` (macOS) or see Railway docs
2. **Railway authentication** - Run `railway login` or set `RAILWAY_TOKEN`
3. **OpenCode** - Using OpenCode as the coding agent

## Testing

Verified:
- ✅ Railway skill loads correctly
- ✅ Railway skill contains accurate repository information
- ✅ OpenCode configuration is valid JSON with correct schema
- ✅ MCP server definitions follow OpenCode conventions
- ✅ Tool permissions are properly configured

## Related

- **Documentation:** `knowledge/operations/opencode-railway-configuration.md`
- **Skill file:** `.opencode/skills/railway-deploy/SKILL.md`
- **Config file:** `.opencode/opencode.json`
- **Railway operations docs:** `knowledge/operations/railway-*.md`
- **OpenCode docs:** https://opencode.ai/docs/skills and https://opencode.ai/docs/mcp-servers

## Next Steps

1. Team members should verify Railway CLI is installed
2. Authenticate with Railway CLI (`railway login`)
3. Test skill loading: `opencode` → "load the railway-deploy skill"
4. Optional: Set up Context7 API key for higher rate limits

---

*Change implemented by AI agent on 2026-05-14*
