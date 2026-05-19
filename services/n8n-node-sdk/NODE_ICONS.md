# Agentyx Custom n8n Nodes — Visual Identity

> All Agentyx custom community nodes now feature the official Agentyx logo branding in the n8n UI.

## Logo Design

The Agentyx logo is a hexagonal honeycomb pattern representing interconnected AI building blocks. Each node icon incorporates this hexagonal mark with a unique functional indicator.

## Node Icons

| Node | Icon Preview | Brand Element | Functional Indicator |
|------|-------------|---------------|---------------------|
| **Agentyx Tenant Context** | Hexagon + building columns | Core hexagon | Organization/building pillars |
| **Agentyx AI Agent (Basic)** | Hexagon + sparkle | Core hexagon | AI sparkle/star |
| **Agentyx Composio MCP Tool** | Hexagon + connector dot | Core hexagon | MCP connector node |
| **Agentyx Channel Input** | Hexagon + down arrow | Core hexagon | Input/download arrow |
| **Agentyx Channel Output** | Hexagon + up arrow | Core hexagon | Output/upload arrow |
| **Agentyx CRM Query** | Hexagon + magnifier | Core hexagon | Search magnifying glass |
| **Agentyx CRM Update** | Hexagon + pencil | Core hexagon | Edit pencil |

## SVG Specifications

- **Size**: 24x24 viewBox
- **Stroke color**: `#2563eb` (Agentyx blue)
- **Stroke width**: 2px
- **Style**: Outline with minimal fills for n8n dark/light mode compatibility

## In n8n UI

When browsing the node panel or viewing a workflow, all Agentyx nodes are visually distinguishable by:
1. The hexagonal brand mark (immediate recognition)
2. The blue color consistent with Agentyx branding
3. The functional sub-icon indicating the node's purpose

## Files

All SVG source files live under:
```
services/n8n-node-sdk/src/nodes/{NodeName}/{NodeName}.svg
```

They are baked into the Docker image at:
```
/usr/local/lib/node_modules/n8n/node_modules/@levinnovation/n8n-nodes-agentyx/dist/nodes/{NodeName}/
```

## Rebuilding

After updating any SVG:
```bash
cd services/n8n-node-sdk
npm run build
# SVGs are auto-copied to dist/ via build script

# Rebuild Docker image
docker build -f services/n8n-yaml-compiler/Dockerfile.n8n -t agentyx-n8n:latest .
```
