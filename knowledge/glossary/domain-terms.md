# Domain terms

| Term | Meaning |
|------|---------|
| Tenant | Business entity owning domains (e.g. `euromobilia`) |
| Domain | Bounded context within a tenant (e.g. `kitchen-commerce`) |
| Capability | Business function owned by a domain; unit of ownership |
| Asset | Versioned implementation artifact of a capability |
| Channel | Customer- or operator-facing surface (WhatsApp, web chat, Slack, Teams, etc.) implemented via **channel-adapter** assets; a capability may attach **multiple** channels over time |
