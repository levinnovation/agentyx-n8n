# n8n Node Policy

> Governance for custom n8n community nodes in this repository.

## Rules

1. Every custom node MUST live under `services/n8n-node-sdk/src/nodes/{NodeName}/`.
2. Every node MUST include:
   - `NodeName.node.ts` — Node implementation
   - `NodeName.svg` — Node icon (24x24, monochrome)
   - `README.md` — Human-readable docs
3. Nodes MUST validate inputs using n8n's `NodeOperationError` for malformed data.
4. Nodes MUST NOT execute arbitrary code from user input (no `eval`, no `new Function`).
5. Nodes that call external APIs MUST use n8n's built-in `request` helpers or `axios` with timeout and retry logic.
6. Credential types MUST be defined in `services/n8n-node-sdk/src/credentials/` and referenced by node `credentials` arrays.
7. Nodes MUST declare `hints` for AI-assisted authoring (description, example, placeholders).

## Allowed Node Categories

| Category | Prefix | Example |
|----------|--------|---------|
| Agentyx Core | `agentyx` | `AgentyxTenantContext` |
| Integration | `agentyx` | `AgentyxComposioTool` |
| Audit | `agentyx` | `AgentyxAuditQuery` |
| Credential | `agentyx` | `AgentyxCredential` |

## Versioning

- The `n8n-node-sdk` package follows semantic versioning.
- Major version bumps when a node changes its input/output schema.
- Minor version bumps for new nodes or backward-compatible features.
- Patch version bumps for bug fixes.

## Publishing

1. Build: `npm run build`
2. Test: `npm test`
3. Tag: `git tag -a n8n-node-sdk-v$(node -p "require('./package.json').version")`
4. Push tag: `git push origin <tag>`
5. CI builds Docker image and publishes to GHCR.

## Enforcement

- `make validate` runs `scripts/validate_n8n_nodes.py` to check node structure.
- CI blocks merge if a node lacks `README.md` or icon.

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- n8n custom node docs: https://docs.n8n.io/integrations/creating-nodes/
