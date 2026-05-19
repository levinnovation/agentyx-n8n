"""Compile an n8n asset from YAML spec to JSON."""

from pathlib import Path
import typer
import yaml
import json

app = typer.Typer()
ROOT = Path(__file__).resolve().parent.parent

# Node type mapping from YAML to n8n node types
NODE_TYPE_MAPPING = {
    "webhook": "n8n-nodes-base.webhook",
    "code": "n8n-nodes-base.code",
    "set": "n8n-nodes-base.set",
    "httpRequest": "n8n-nodes-base.httpRequest",
    "executeWorkflowTrigger": "n8n-nodes-base.executeWorkflowTrigger",
    "executeWorkflow": "n8n-nodes-base.executeWorkflow",
    "respondToWebhook": "n8n-nodes-base.respondToWebhook",
    "switch": "n8n-nodes-base.switch",
    "agentyxTenantContext": "@levinnovation/n8n-nodes-agentyx.agentyxTenantContext",
    "agentyxAIAgentBasicNode": "@levinnovation/n8n-nodes-agentyx.agentyxAIAgentBasicNode",
    "agentyxComposioMcpToolNode": "@levinnovation/n8n-nodes-agentyx.agentyxComposioMcpToolNode",
    "agentyxChannelFormattedInputNode": "@levinnovation/n8n-nodes-agentyx.agentyxChannelFormattedInputNode",
    "agentyxChannelFormattedOutputNode": "@levinnovation/n8n-nodes-agentyx.agentyxChannelFormattedOutputNode",
    "agentyxCRMQuery": "@levinnovation/n8n-nodes-agentyx.agentyxCRMQuery",
    "agentyxCRMUpdate": "@levinnovation/n8n-nodes-agentyx.agentyxCRMUpdate",
}

@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
    asset: str = typer.Option(..., "--asset", "-a"),
):
    asset_dir = ROOT / "tenants" / tenant / "assets" / "workflows" / "n8n" / asset
    yaml_path = asset_dir / "workflow.yaml"
    json_path = asset_dir / "workflow.json"
    
    if not yaml_path.exists():
        typer.echo(f"Error: workflow.yaml not found at {yaml_path}")
        raise typer.Exit(1)
    
    with open(yaml_path, "r") as f:
        yaml_content = yaml.safe_load(f)
    
    metadata = yaml_content.get("metadata", {})
    spec = yaml_content.get("spec", {})
    
    # Build n8n JSON structure
    n8n_nodes = []
    node_name_to_id = {}
    
    for idx, node in enumerate(spec.get("nodes", [])):
        node_name = node["name"]
        node_type = NODE_TYPE_MAPPING.get(node["type"], node["type"])
        
        n8n_node = {
            "parameters": node.get("config", {}),
            "id": f"node-{idx}",
            "name": node_name,
            "type": node_type,
            "typeVersion": 1,
            "position": node.get("position", [240 + idx * 200, 300]),
        }
        
        if node["type"] == "webhook":
            n8n_node["webhookId"] = node.get("config", {}).get("path", "")
        
        node_name_to_id[node_name] = n8n_node["id"]
        n8n_nodes.append(n8n_node)
    
    # Build connections
    n8n_connections = {}
    for conn in spec.get("connections", []):
        from_node = conn["from"]
        to_node = conn["to"]
        
        if from_node not in n8n_connections:
            n8n_connections[from_node] = {"main": [[]]}
        
        n8n_connections[from_node]["main"][0].append({
            "node": to_node,
            "type": "main",
            "index": 0,
        })
    
    n8n_json = {
        "name": metadata.get("name", asset),
        "id": metadata.get("name", asset),
        "nodes": n8n_nodes,
        "connections": n8n_connections,
        "settings": spec.get("settings", {}),
        "tags": spec.get("tags", []),
        "active": False,
        "versionId": None,
    }
    
    with open(json_path, "w") as f:
        json.dump(n8n_json, f, indent=2, ensure_ascii=False)
    
    typer.echo(f"Compiled: {json_path}")
    
    # Update asset.yaml status
    asset_yaml_path = asset_dir / "asset.yaml"
    if asset_yaml_path.exists():
        with open(asset_yaml_path, "r") as f:
            asset_yaml = yaml.safe_load(f)
        
        if "asset" in asset_yaml:
            asset_yaml["asset"]["status"] = "compiled"
        
        with open(asset_yaml_path, "w") as f:
            yaml.dump(asset_yaml, f, sort_keys=False, allow_unicode=True)
        
        typer.echo(f"Updated status: compiled")

if __name__ == "__main__":
    app()