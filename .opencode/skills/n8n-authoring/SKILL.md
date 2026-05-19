---
name: n8n-authoring
description: Scaffold, validate, and compile n8n workflows from YAML specs
license: MIT
compatibility: opencode
metadata:
  audience: developers, ai-agents
  workflow: n8n-sdlc
---

## When to use

When the user wants to:
- Create a new n8n workflow asset
- Modify an existing n8n workflow
- Validate a workflow spec
- Compile YAML into n8n JSON
- Understand the n8n SDLC architecture

## Workflow

1. **Read context**: Load `knowledge/context-packs/n8n-sdk-context.md`, the relevant `capability.yaml`, and existing workflow YAMLs in the same capability.
2. **Scaffold** (if new): Use `agentyx n8n scaffold --tenant ... --domain ... --capability ... --asset ...` or create files manually following the YAML spec.
3. **Edit YAML**: Modify `workflow.yaml` — never `workflow.json`.
4. **Compile**: Run `agentyx n8n compile --tenant ... --asset ...`.
5. **Validate**: Run `make validate` to ensure spec compliance.
6. **Present diff**: Show the user what changed before any deploy.

## Rules

- **Never edit `.json` workflow files directly**; always edit YAML and recompile.
- All credentials must reference YAML files in `assets/credentials/`.
- After compilation, update `asset.yaml` status to `compiled`.
- Follow the core + channel adapter pattern from ADR-0028:
  - Core workflows use `trigger.type: executeWorkflowTrigger`.
  - Channel adapters use `trigger.type: webhook` and call the core via an `executeWorkflow` node.
- Use custom node types from `@levinnovation/n8n-nodes-agentyx` when available.

## Example

User: "Create a WhatsApp channel adapter for the customer-service-core"

Skill actions:
1. Read `tenants/levinnovation/domains/customer-service/capabilities/lead-qualification/capability.yaml`
2. Read `tenants/levinnovation/assets/workflows/n8n/customer-service-core/workflow.yaml` to understand the input contract
3. Scaffold `chan-kapso-wa-customer-service-v2/workflow.yaml` with:
   - `trigger.type: webhook` with Kapso payload parsing
   - `executeWorkflow` node calling `customer-service-core`
   - HTTP Request node sending reply back to Kapso
4. Compile: `agentyx n8n compile --tenant levinnovation --asset chan-kapso-wa-customer-service-v2`
5. Validate: `make validate`
6. Show the user the compiled JSON path and advise `git add + commit + deploy`

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- SDK context: `knowledge/context-packs/n8n-sdk-context.md`
- SDK setup: `knowledge/operations/n8n-sdk-setup.md`
