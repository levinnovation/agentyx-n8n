#!/usr/bin/env python3
"""Deploy compiled n8n workflow JSONs to a running n8n instance via REST API.

Usage:
    python scripts/deploy_n8n_workflows.py \
        --tenant levinnovation \
        --env dev \
        --assets demo-agentyx-nodes customer-service-core-v2
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import httpx

ROOT = Path(__file__).resolve().parent.parent


def api_headers(api_key: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": api_key,
    }


def deploy_workflow(client: httpx.Client, n8n_url: str, api_key: str, workflow_path: Path) -> dict:
    payload = json.loads(workflow_path.read_text(encoding="utf-8"))
    name = payload.get("name", workflow_path.stem)

    # Check if workflow exists
    resp = client.get(
        urljoin(n8n_url, "/api/v1/workflows"),
        headers=api_headers(api_key),
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    workflows = data.get("data", []) if isinstance(data, dict) else data
    
    existing_id = None
    for wf in workflows:
        if wf.get("name") == name:
            existing_id = wf.get("id")
            break

    # Remove server-managed fields
    for field in ["versionId", "createdAt", "updatedAt", "isArchived", "meta", 
                   "staticData", "pinData", "tags", "shared", "activeVersion", 
                   "activeVersionId", "triggerCount", "versionCounter", "id", "active", "description"]:
        payload.pop(field, None)
    
    settings = payload.get("settings")
    if isinstance(settings, dict):
        settings.pop("binaryMode", None)

    if existing_id:
        resp = client.put(
            urljoin(n8n_url, f"/api/v1/workflows/{existing_id}"),
            headers=api_headers(api_key),
            json=payload,
            timeout=30.0,
        )
        print(f"  Updated: {name} (id: {existing_id})")
    else:
        resp = client.post(
            urljoin(n8n_url, "/api/v1/workflows"),
            headers=api_headers(api_key),
            json=payload,
            timeout=30.0,
        )
        print(f"  Created: {name}")
    
    resp.raise_for_status()
    return resp.json()


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Deploy compiled n8n workflows")
    parser.add_argument("--tenant", required=True, help="Tenant slug")
    parser.add_argument("--env", default="dev", help="Environment")
    parser.add_argument("--n8n-url", help="n8n base URL (overrides env)")
    parser.add_argument("--api-key", help="n8n API key (overrides env)")
    parser.add_argument("--assets", nargs="+", help="Specific asset names to deploy")
    parser.add_argument("--all", action="store_true", help="Deploy all compiled workflows")
    args = parser.parse_args(argv)

    n8n_url = args.n8n_url or input("n8n URL: ").strip()
    api_key = args.api_key or input("n8n API Key: ").strip()

    if not n8n_url or not api_key:
        print("Error: n8n URL and API key are required", file=sys.stderr)
        return 1

    workflow_dir = ROOT / "tenants" / args.tenant / "assets" / "workflows" / "n8n"
    
    if not workflow_dir.exists():
        print(f"Error: Workflow directory not found: {workflow_dir}", file=sys.stderr)
        return 1

    assets_to_deploy = args.assets or []
    if args.all:
        assets_to_deploy = [d.name for d in workflow_dir.iterdir() if d.is_dir() and (d / "workflow.json").exists()]

    if not assets_to_deploy:
        print("Error: No assets specified. Use --assets or --all", file=sys.stderr)
        return 1

    print(f"Deploying {len(assets_to_deploy)} workflow(s) to {n8n_url}")
    
    with httpx.Client(follow_redirects=True) as client:
        for asset_name in assets_to_deploy:
            json_path = workflow_dir / asset_name / "workflow.json"
            if not json_path.exists():
                print(f"  SKIP: {asset_name} (workflow.json not found)")
                continue
            
            try:
                result = deploy_workflow(client, n8n_url, api_key, json_path)
                print(f"  OK: {result.get('name')} (id: {result.get('id')})")
            except Exception as exc:
                print(f"  FAIL: {asset_name} — {exc}", file=sys.stderr)
                return 1

    print("\nDeployment complete!")
    return 0


if __name__ == "__main__":
    sys.exit(main())