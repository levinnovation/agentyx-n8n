# LinkedIn Lead Prospecting Capability

Deterministic lead-generation and qualification capability for LEV Innovation's
internal outbound process.

## Assets

- `agente-prospectador-ai` - n8n workflow export under `tenants/levinnovation/assets/workflows/n8n/`
- `agente-prospectador.system.md` - system prompt used for qualification/outreach generation
- `lev-innovation-knowledge.md` - tenant context loaded into n8n Simple Vector Store

## Operational notes

- LinkedIn direct messaging is generated as copy and tracked as HubSpot task in v1.
- Calendar booking in v1 proposes slots; event creation after reply is a phase-2 workflow.
