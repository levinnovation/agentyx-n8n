# ADR-0007: Multi-interface deployment for tenant assets

**Status:** Accepted  
**Date:** 2026-04-29

## Context

It is easy to describe the platform as “WhatsApp-first” or “Kapso-first” because Euromobilia’s first production surface is WhatsApp via Kapso. That wording risks misleading maintainers: the **repository architecture** is **tenant → domain → capability → assets**. Customer and operator **interfaces** (WhatsApp, Slack, Microsoft Teams, web widget, web chat, Telegram, email, etc.) are **deployment choices** realized by **channel-adapter** and **workflow** assets (and optional ingress orchestration), not the organizing principle of the repo.

## Decision

1. **Capabilities and core agents are interface-agnostic.** Business logic (e.g. `kitchen-quotation` / `quotation-assistant`) is specified and versioned without assuming a single channel.
2. **Each interface is a separate asset** (typically under `tenants/{tenant}/assets/channels/` and related `n8n-workflow` assets), with its own contracts (webhooks, payload normalization, formatting constraints).
3. **Kapso / `whatsapp-kapso` is one channel asset among many allowed.** Additional channels are added by new assets and capability references, not by renaming the domain model.
4. **Documentation and diagrams** MUST distinguish **business priority** (e.g. “Euromobilia leads on WhatsApp commercially”) from **architectural fact** (“multiple interfaces can attach to the same capability”).

## Consequences

### Positive

- New surfaces (Slack, Teams, web widget) do not require restructuring the tenant tree.
- Channel-specific policies (e.g. WhatsApp formatting) stay in channel assets, prompts, and `standards/policies/`, not in capability names.

### Negative

- More assets to maintain when many channels go live (one adapter + contracts per provider).
- Ingress routing (e.g. n8n) must stay thin: normalize to a shared internal shape before calling the agent.

## Rejected alternatives

- Treating WhatsApp/Kapso as the **root** of the architecture (would re-introduce vendor-centric organization).

## Follow-up

- When a second channel goes live for Euromobilia, add its `channel-adapter` asset, `channel.yaml`, and reference it from the relevant `capability.yaml` alongside `whatsapp-kapso`.
- Keep `DOMAIN_MODEL.md` and tenant context packs aligned with this ADR.
