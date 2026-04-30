"""Import n8n workflow JSON files into a running n8n instance via REST API.

Usage:
    python scripts/import_n8n_workflow.py \
        --json-path tenants/euromobilia/assets/workflows/n8n/kapso-inbound-quotation.json \
        --n8n-url http://187.127.252.161 \
        --api-key $N8N_API_KEY
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urljoin

import httpx


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


def find_workflow_by_name(workflows: list[dict], name: str) -> str | None:
    for wf in workflows:
        if wf.get("name") == name:
            return wf.get("id")
    return None


def create_workflow(client: httpx.Client, n8n_url: str, api_key: str, payload: dict) -> dict:
    # Remove id so n8n assigns a new one
    payload = {k: v for k, v in payload.items() if k != "id"}
    resp = client.post(
        urljoin(n8n_url, "/api/v1/workflows"),
        headers=_api_headers(api_key),
        json=payload,
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def update_workflow(client: httpx.Client, n8n_url: str, api_key: str, workflow_id: str, payload: dict) -> dict:
    payload = {**payload, "id": workflow_id}
    resp = client.put(
        urljoin(n8n_url, f"/api/v1/workflows/{workflow_id}"),
        headers=_api_headers(api_key),
        json=payload,
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def activate_workflow(client: httpx.Client, n8n_url: str, api_key: str, workflow_id: str) -> dict:
    resp = client.post(
        urljoin(n8n_url, f"/api/v1/workflows/{workflow_id}/activate"),
        headers=_api_headers(api_key),
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def import_workflow(json_path: Path, n8n_url: str, api_key: str, activate: bool = True) -> dict:
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    name = payload.get("name", json_path.stem)

    with httpx.Client(follow_redirects=True) as client:
        workflows = list_workflows(client, n8n_url, api_key)
        existing_id = find_workflow_by_name(workflows, name)

        if existing_id:
            print(f"Updating workflow '{name}' (id: {existing_id})")
            result = update_workflow(client, n8n_url, api_key, existing_id, payload)
        else:
            print(f"Creating workflow '{name}'")
            result = create_workflow(client, n8n_url, api_key, payload)
            existing_id = result.get("id")

        if activate and existing_id and payload.get("active", False):
            print(f"Activating workflow '{name}'")
            activate_workflow(client, n8n_url, api_key, existing_id)

    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import n8n workflows via REST API")
    parser.add_argument("--json-path", required=True, type=Path, help="Path to workflow JSON file")
    parser.add_argument("--n8n-url", required=True, help="n8n base URL (e.g. http://host)")
    parser.add_argument("--api-key", required=True, help="n8n API key")
    parser.add_argument("--no-activate", action="store_true", help="Skip activation")
    args = parser.parse_args(argv)

    try:
        result = import_workflow(
            args.json_path,
            args.n8n_url,
            args.api_key,
            activate=not args.no_activate,
        )
        print(f"OK: {result.get('name')} (id: {result.get('id')})")
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
