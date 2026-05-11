#!/usr/bin/env python3
"""Validate n8n runtime parity across main/worker/webhook Railway services."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


DEFAULT_SERVICES = ["agx-demo-n8n", "agx-demo-n8n-worker", "agx-demo-n8n-webhook"]
DEFAULT_IMAGE = "ghcr.io/levinnovation/agentyx-n8n:latest"


def die(message: str) -> None:
    print(f"[ERROR] {message}", file=sys.stderr)
    raise SystemExit(1)


def load_railway_config() -> dict[str, Any]:
    path = Path.home() / ".railway" / "config.json"
    if not path.exists():
        die("Railway config not found. Run `railway login` first.")
    return json.loads(path.read_text(encoding="utf-8"))


def infer_project_environment(cfg: dict[str, Any], cwd: Path) -> tuple[str, str]:
    projects = cfg.get("projects", {})
    if not isinstance(projects, dict):
        die("Invalid Railway config: `projects` is missing.")

    cwd_str = str(cwd.resolve())
    candidates = [(key, value) for key, value in projects.items() if cwd_str.startswith(key)]
    if not candidates:
        die("Could not infer linked Railway project/environment from current path.")

    key, value = max(candidates, key=lambda kv: len(kv[0]))
    project_id = value.get("project")
    environment_id = value.get("environment")
    if not project_id or not environment_id:
        die(f"Linked entry {key} is missing project/environment IDs.")
    return project_id, environment_id


def graphql(access_token: str, query: str) -> dict[str, Any]:
    payload = json.dumps({"query": query})
    cmd = [
        "curl",
        "-s",
        "-H",
        f"Authorization: Bearer {access_token}",
        "-H",
        "Content-Type: application/json",
        "-X",
        "POST",
        "https://backboard.railway.app/graphql/v2",
        "-d",
        payload,
    ]
    out = subprocess.check_output(cmd, text=True)
    body = json.loads(out)
    if "errors" in body:
        die(f"Railway GraphQL error: {body['errors']}")
    return body


def main() -> int:
    parser = argparse.ArgumentParser(description="Check runtime parity for n8n queue services")
    parser.add_argument("--project-id", help="Railway project ID (optional)")
    parser.add_argument("--environment-id", help="Railway environment ID (optional)")
    parser.add_argument(
        "--services",
        default=",".join(DEFAULT_SERVICES),
        help="Comma-separated service names (default: agx-demo n8n queue roles)",
    )
    parser.add_argument(
        "--expect-image",
        default=os.getenv("N8N_RUNTIME_IMAGE", DEFAULT_IMAGE),
        help="Expected image source for all services",
    )
    parser.add_argument(
        "--enforce-image",
        action="store_true",
        help="Fail if any service source is not exactly --expect-image",
    )
    args = parser.parse_args()

    cfg = load_railway_config()
    access_token = cfg.get("user", {}).get("accessToken")
    if not access_token:
        die("No Railway access token available. Run `railway login`.")

    if args.project_id and args.environment_id:
        project_id = args.project_id
        environment_id = args.environment_id
    else:
        project_id, environment_id = infer_project_environment(cfg, Path.cwd())

    service_names = [s.strip() for s in args.services.split(",") if s.strip()]
    if not service_names:
        die("No services provided.")

    query = f"""
    query {{
      project(id: "{project_id}") {{
        services {{
          edges {{
            node {{
              id
              name
              serviceInstances {{
                edges {{
                  node {{
                    environmentId
                    source {{ image repo }}
                    latestDeployment {{ id status meta }}
                  }}
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """
    data = graphql(access_token, query)["data"]["project"]["services"]["edges"]

    by_name: dict[str, dict[str, Any]] = {}
    for edge in data:
        node = edge["node"]
        if node["name"] not in service_names:
            continue
        inst = None
        for instance_edge in node.get("serviceInstances", {}).get("edges", []):
            candidate = instance_edge["node"]
            if candidate.get("environmentId") == environment_id:
                inst = candidate
                break
        if inst is not None:
            by_name[node["name"]] = inst

    missing = [name for name in service_names if name not in by_name]
    if missing:
        die(f"Missing service instances in environment {environment_id}: {', '.join(missing)}")

    print("n8n runtime parity check")
    print(f"project={project_id}")
    print(f"environment={environment_id}")
    print(f"expect_image={args.expect_image}")
    print("")

    sources: dict[str, str] = {}
    digests: dict[str, str] = {}
    ok = True

    for name in service_names:
        inst = by_name[name]
        source = inst.get("source") or {}
        image = source.get("image")
        repo = source.get("repo")
        meta = (inst.get("latestDeployment") or {}).get("meta") or {}
        image_digest = meta.get("imageDigest") if isinstance(meta, dict) else None
        commit_hash = meta.get("commitHash") if isinstance(meta, dict) else None
        branch = meta.get("branch") if isinstance(meta, dict) else None

        if image:
            source_sig = f"image:{image}"
        elif repo:
            source_sig = f"repo:{repo}@{branch or '?'}#{commit_hash or '?'}"
        else:
            source_sig = "unknown"

        sources[name] = source_sig
        digests[name] = image_digest or "-"

        print(f"- {name}")
        print(f"  source={source_sig}")
        print(f"  imageDigest={image_digest or '-'}")

        if args.enforce_image and image != args.expect_image:
            ok = False
            print(f"  [MISMATCH] expected image {args.expect_image}")

    unique_sources = set(sources.values())
    if len(unique_sources) != 1:
        ok = False
        print("")
        print("[MISMATCH] Services are not on the same runtime source:")
        for name, sig in sources.items():
            print(f"  - {name}: {sig}")

    if not ok:
        return 1

    print("")
    print("[OK] n8n runtime parity is healthy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

