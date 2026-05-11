#!/usr/bin/env python3
"""Fail CI if portal deploy source lock drifts from canonical values."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Cannot read {path}: {exc}") from exc


def _read_json(path: Path) -> dict:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot parse JSON {path}: {exc}") from exc


def _extract_default(script_text: str, var_name: str) -> str:
    pattern = re.compile(
        rf'^{re.escape(var_name)}="\$\{{{re.escape(var_name)}:-([^}}]+)\}}"$',
        re.MULTILINE,
    )
    match = pattern.search(script_text)
    if not match:
        raise RuntimeError(f"Missing default declaration for {var_name}")
    return match.group(1)


def _fail(msg: str) -> None:
    print(f"[ERROR] {msg}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate canonical portal repo/branch source-lock invariants."
    )
    parser.add_argument(
        "--expected-repo",
        default="levinnovation/agentyx-client-portal",
        help="Canonical portal repository slug.",
    )
    parser.add_argument(
        "--expected-branch",
        default="main",
        help="Canonical portal branch.",
    )
    parser.add_argument(
        "--template-config",
        default="templates/assets/railway-tenant-stack/template-config.json",
        help="Path to template-config JSON.",
    )
    parser.add_argument(
        "--configure-script",
        default="scripts/railway/configure-tenant-post-deploy.sh",
        help="Path to post-deploy configure script.",
    )
    parser.add_argument(
        "--reconcile-script",
        default="scripts/railway/reconcile-portal-links.sh",
        help="Path to portal reconciliation script.",
    )
    args = parser.parse_args()

    ok = True

    template_config_path = Path(args.template_config)
    configure_script_path = Path(args.configure_script)
    reconcile_script_path = Path(args.reconcile_script)

    try:
        template_config = _read_json(template_config_path)
        portal_source = template_config["services"]["portal"]["source"]
        portal_repo = str(portal_source["repo"])
        portal_branch = str(portal_source["branch"])
    except (KeyError, RuntimeError) as exc:
        _fail(str(exc))
        return 1

    if portal_repo != args.expected_repo:
        _fail(
            f"template-config portal repo mismatch: expected {args.expected_repo}, got {portal_repo}"
        )
        ok = False
    if portal_branch != args.expected_branch:
        _fail(
            f"template-config portal branch mismatch: expected {args.expected_branch}, got {portal_branch}"
        )
        ok = False

    for script_path in (configure_script_path, reconcile_script_path):
        try:
            script_text = _read_text(script_path)
            repo_default = _extract_default(script_text, "EXPECTED_PORTAL_REPO")
            branch_default = _extract_default(script_text, "EXPECTED_PORTAL_BRANCH")
        except RuntimeError as exc:
            _fail(f"{script_path}: {exc}")
            return 1

        if repo_default != args.expected_repo:
            _fail(
                f"{script_path}: EXPECTED_PORTAL_REPO mismatch: expected {args.expected_repo}, got {repo_default}"
            )
            ok = False
        if branch_default != args.expected_branch:
            _fail(
                f"{script_path}: EXPECTED_PORTAL_BRANCH mismatch: expected {args.expected_branch}, got {branch_default}"
            )
            ok = False

    if not ok:
        return 1

    print("[OK] Portal source lock invariants verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
