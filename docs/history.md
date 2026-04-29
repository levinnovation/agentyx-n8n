# History

> Why this repository exists.

## The AUREA Experiment (2024–2025)

The original `aurea-aragroupcr` repository pioneered agentic workflows for kitchen commerce. It proved that LangGraph + n8n + WhatsApp could automate quotation flows end-to-end. But it also revealed a critical flaw: the codebase was organized by tool type (`agents/`, `workflows/`, `tools/`), not by business domain. This made it impossible to answer simple questions like "which capabilities does the euromobilia tenant have?" without grepping across unrelated directories.

## The Vertical Reframe (2025–2026)

The insight: in a multi-tenant, multi-domain platform, the organizing principle must be the business domain itself. A LangGraph agent is not a category — it is an **asset** of a **capability** inside a **domain** owned by a **tenant**.

This repository, `agentyx-vertical-assets`, encodes that reframe as a schema-governed, Git-native asset management system.

## Design Principles

1. **Tenant sovereignty.** Every tenant's assets are self-contained.
2. **Capability completeness.** A capability is not a capability until it has all required assets declared.
3. **Runtime agnosticism.** This repo is the source of truth; the runtime consumes it.

## Codenames

- "AUREA" — the original project name, retained only in this file for historical context.
