# ADR-0018: n8n MCP for AI-Assisted Workflow Authoring

**Status:** Accepted  
**Date:** 2026-05-05  
**Deciders:** AI Team

## Context

n8n workflows are versioned as JSON in Git (`tenants/{tenant}/assets/workflows/n8n/`) and deployed via CI/CD. Currently, developers must either:
- Use the n8n visual editor (click-based, slow, error-prone)
- Hand-write workflow JSON (requires deep node knowledge)

Both approaches create friction and slow down capability iteration.

## Decision

Adopt **n8n-mcp** (Model Context Protocol server for n8n) to enable AI-assisted "vibe coding" of workflows in Cursor/Claude.

### Architecture

```
AI Assistant (Cursor/Claude)
    ↓ MCP stdio or HTTP
n8n-mcp server
    ↓ REST API
n8n instance (Railway)
    ↓ reads/writes
Git-repo workflow JSON (source of truth)
```

### Key Rules

1. **Git-first**: AI-generated workflow JSON MUST be saved to the repo before production deploy. Direct `n8n_create_workflow` is only for rapid prototyping in dev.
2. **Validation**: Run `make validate` after any JSON changes.
3. **Safety**: Always copy a workflow before AI-editing it. Never edit production workflows directly.

### Deployment Model

- **Local IDE**: Developers configure `.cursor/mcp.json` or Claude Desktop config with `npx n8n-mcp`
- **Shared Railway service** (optional): `[n8n-mcp]` in `railway.toml` runs in HTTP mode for team access
- **n8n image**: Built from `levinnovation/agentyx-n8n` fork via GitHub Actions → GHCR

## Consequences

### Positive

- 10x faster workflow prototyping via natural language
- AI has access to 1,650+ n8n node docs for accurate config generation
- Template discovery (2,352 templates) reduces reinventing common patterns
- Validation tools catch config errors before deploy

### Negative

- AI-generated workflows require human review before production
- MCP server adds one more moving part to monitor
- Build time for n8n fork image is ~20-30 min (mitigated by GHCR pre-build)

## Rejected Alternatives

- **n8n-first authoring** (AI deploys directly to n8n, human exports back to Git) — violates Git-as-source-of-truth principle
- **Custom internal MCP** — n8n-mcp is mature (20k+ stars), actively maintained, covers full node library

## Implementation

- `.cursor/mcp.json` template in repo root
- `.claude/CLAUDE.md` updated with n8n MCP instructions
- `knowledge/operations/n8n-mcp-setup.md` guide
- `[n8n-mcp]` service block in `railway.toml`
- GitHub Actions workflow in `agentyx-n8n` fork for GHCR image builds

## References

- [n8n-mcp GitHub](https://github.com/czlonkowski/n8n-mcp)
- `knowledge/operations/n8n-mcp-setup.md`
