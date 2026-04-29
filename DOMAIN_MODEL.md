# Domain Model

> How this repository thinks about the world.

## Core Entities

### Tenant
A business entity that owns domains and capabilities. Example: `euromobilia`.

### Domain
A bounded context within a tenant. Example: `kitchen-commerce`.

### Capability
A business function inside a domain. Capabilities are the unit of ownership. Example: `kitchen-quotation`.

### Asset
An implementation artifact of a capability. Assets have types:
- `langgraph-agent`
- `n8n-workflow`
- `channel-adapter`
- `integration`
- `data-contract`
- `rag-contract`
- `infra`
- `deployment`
- `prompt`
- `eval`

## Relationships

```mermaid
flowchart TD
    Tenant[Tenant: euromobilia] --> Domain[Domain: kitchen-commerce]
    Domain --> CapQuote[Capability: kitchen-quotation]
    Domain --> CapHandoff[Capability: human-handoff]
    Domain --> CapCatalog[Capability: product-catalog-retrieval]
    Domain --> CapDoc[Capability: quote-document-generation]
    CapQuote --> AssetAgent["Asset: langgraph-agent / quotation-assistant"]
    CapQuote --> AssetN8N["Asset: n8n-workflow / kapso-inbound-quotation"]
    CapQuote --> AssetChan["Asset: channel-adapter / whatsapp-kapso"]
    CapQuote --> AssetData["Asset: data-contract / product-catalog"]
    CapQuote --> AssetRag["Asset: rag-contract / catalog-rag"]
    CapQuote --> AssetInfra["Asset: infra / supabase"]
    CapQuote --> AssetDeploy["Asset: deployment / render+railway+fly+cloud-run"]
```

## Invariants

1. Every asset belongs to exactly one capability.
2. Every capability belongs to exactly one domain.
3. Every domain belongs to exactly one tenant.
4. An asset MAY be referenced by multiple capabilities within the same tenant via explicit `dependencies`.
5. Cross-tenant references are FORBIDDEN.

## Asset Lifecycle

```
scaffolded → validated → compiled → deployed → monitored → deprecated → retired
```

States are tracked in `asset.yaml`.

## Glossary

| Term | Definition |
|------|------------|
| Capability | A business function with a defined input, output, and SLA |
| Asset | A deployable artifact that realizes (part of) a capability |
| Channel | A communication surface (WhatsApp, web, email, etc.) |
| Contract | A schema-bound interface between assets |
| Scaffold | A reusable template for creating new instances |
