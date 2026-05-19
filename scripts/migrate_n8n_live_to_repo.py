#!/usr/bin/env python3
"""Migrate live n8n workflows into the repo as YAML source of truth.

Usage:
    python scripts/migrate_n8n_live_to_repo.py \
        --tenant levinnovation \
        --n8n-url https://levinnovation.n8n.agentyx.one \
        --api-key $N8N_API_KEY \
        --output-dir ./migration-levinnovation
"""

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urljoin

import httpx
import yaml


def _api_headers(api_key: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": api_key,
    }


def list_workflows(client: httpx.Client, n8n_url: str, api_key: str) -> list[dict]:
    resp = client.get(
        urljoin(n8n_url, "/api/v1/workflows"),
        headers=_api_headers(api_key),
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", []) if isinstance(data, dict) else data


def get_workflow(client: httpx.Client, n8n_url: str, api_key: str, workflow_id: str) -> dict:
    resp = client.get(
        urljoin(n8n_url, f"/api/v1/workflows/{workflow_id}"),
        headers=_api_headers(api_key),
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def generate_workflow_yaml(workflow: dict, tenant: str) -> str:
    """Reconstruct a simplified workflow YAML from n8n JSON."""
    name = workflow.get("name", "unknown")
    nodes = workflow.get("nodes", [])
    connections = workflow.get("connections", {})
    settings = workflow.get("settings", {})
    tags = workflow.get("tags", [])

    yaml_nodes = []
    for node in nodes:
        yaml_nodes.append({
            "name": node.get("name"),
            "type": node.get("type", "").replace("n8n-nodes-base.", ""),
            "position": node.get("position", [240, 300]),
            "config": node.get("parameters", {}),
        })

    yaml_connections = []
    for from_node, conns in connections.items():
        if isinstance(conns, dict) and "main" in conns:
            for branch in conns["main"]:
                for to_conn in branch:
                    yaml_connections.append({
                        "from": from_node,
                        "to": to_conn.get("node"),
                    })

    doc = {
        "apiVersion": "agentyx.io/v1",
        "kind": "N8nWorkflow",
        "metadata": {
            "name": name,
            "tenant": tenant,
            "version": "1.0.0",
            "status": "migrated",
        },
        "spec": {
            "trigger": {
                "type": _infer_trigger_type(nodes),
            },
            "nodes": yaml_nodes,
            "connections": yaml_connections,
            "settings": settings,
            "tags": [t.get("name") if isinstance(t, dict) else t for t in tags],
        },
    }
    return yaml.dump(doc, sort_keys=False, allow_unicode=True)


def _infer_trigger_type(nodes: list[dict]) -> str:
    for node in nodes:
        if node.get("type") == "n8n-nodes-base.webhook":
            return "webhook"
        if node.get("type") == "n8n-nodes-base.scheduleTrigger":
            return "schedule"
        if node.get("type") == "n8n-nodes-base.executeWorkflowTrigger":
            return "executeWorkflowTrigger"
    return "manual"


def generate_asset_yaml(name: str, tenant: str) -> str:
    doc = {
        "asset": {
            "name": name,
            "type": "n8n-workflow",
            "tenant": tenant,
            "status": "migrated",
            "description": f"Migrated from live n8n instance on {Path(__file__).name}",
            "files": [
                "workflow.yaml",
                "workflow.json",
                "asset.yaml",
                "README.md",
            ],
        }
    }
    return yaml.dump(doc, sort_keys=False, allow_unicode=True)


def generate_readme(name: str, workflow: dict) -> str:
    nodes = workflow.get("nodes", [])
    node_list = "\n".join([f"- {n.get('name')} ({n.get('type')})" for n in nodes])
    return f"""# {name}

> Auto-generated migration README.

## Nodes

{node_list}

## Migration Notes

- Migrated from live n8n instance.
- Review `workflow.yaml` for accuracy before deploying.
- Credential stubs must be manually populated in `assets/credentials/`.
"""


def migrate(tenant: str, n8n_url: str, api_key: str, output_dir: Path) -> None:
    output_dir = output_dir / tenant
    workflows_dir = output_dir / "workflows"
    credentials_dir = output_dir / "credentials"
    workflows_dir.mkdir(parents=True, exist_ok=True)
    credentials_dir.mkdir(parents=True, exist_ok=True)

    report = {"tenant": tenant, "migratedWorkflows": [], "credentialStubs": []}

    with httpx.Client(follow_redirects=True) as client:
        live_workflows = list_workflows(client, n8n_url, api_key)
        print(f"Found {len(live_workflows)} live workflows for tenant '{tenant}'")

        for wf_meta in live_workflows:
            wf_id = wf_meta.get("id")
            wf_name = wf_meta.get("name")
            if not wf_id or not wf_name:
                continue

            try:
                full = get_workflow(client, n8n_url, api_key, wf_id)
            except Exception as exc:
                print(f"  SKIP {wf_name}: {exc}")
                continue

            asset_dir = workflows_dir / wf_name
            asset_dir.mkdir(parents=True, exist_ok=True)

            # Save exact JSON export
            (asset_dir / "workflow.json").write_text(
                json.dumps(full, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

            # Save reconstructed YAML
            (asset_dir / "workflow.yaml").write_text(
                generate_workflow_yaml(full, tenant),
                encoding="utf-8",
            )

            # Save asset.yaml
            (asset_dir / "asset.yaml").write_text(
                generate_asset_yaml(wf_name, tenant),
                encoding="utf-8",
            )

            # Save README
            (asset_dir / "README.md").write_text(
                generate_readme(wf_name, full),
                encoding="utf-8",
            )

            report["migratedWorkflows"].append({
                "name": wf_name,
                "id": wf_id,
                "active": full.get("active"),
                "nodesCount": len(full.get("nodes", [])),
            })
            print(f"  Migrated: {wf_name}")

    # Credential stubs placeholder
    stub = {
        "apiVersion": "agentyx.io/v1",
        "kind": "N8nCredential",
        "metadata": {
            "name": "example-credential",
            "tenant": tenant,
        },
        "spec": {
            "type": "replaceWithRealType",
            "description": "Migrated from live n8n — MANUAL_ENTRY_REQUIRED",
            "data": "[MIGRATED_FROM_LIVE — MANUAL_ENTRY_REQUIRED]",
        },
    }
    (credentials_dir / "README.md").write_text(
        "# Credential Stubs\n\nReview live n8n credentials and create YAML files here.\n",
        encoding="utf-8",
    )
    (credentials_dir / "example.credential.yaml").write_text(
        yaml.dump(stub, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    report["credentialStubs"].append("example.credential.yaml")

    # Save report
    (output_dir / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\nMigration complete. Output: {output_dir}")
    print(f"Workflows: {len(report['migratedWorkflows'])}")
    print(f"Credential stubs: {len(report['credentialStubs'])}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Migrate live n8n workflows to repo YAML")
    parser.add_argument("--tenant", required=True, help="Tenant slug")
    parser.add_argument("--n8n-url", required=True, help="n8n base URL")
    parser.add_argument("--api-key", required=True, help="n8n API key")
    parser.add_argument("--output-dir", required=True, type=Path, help="Output directory")
    args = parser.parse_args(argv)

    try:
        migrate(args.tenant, args.n8n_url, args.api_key, args.output_dir)
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
