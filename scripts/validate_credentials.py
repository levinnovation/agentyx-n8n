#!/usr/bin/env python3
"""Validate credential YAML files against the credential spec schema."""

import json
import sys
from pathlib import Path
import yaml
from jsonschema import validate, ValidationError

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "standards" / "schemas" / "credential-spec.schema.json"


def validate_credentials(tenant: str) -> int:
    schema = json.loads(SCHEMA_PATH.read_text())
    cred_dir = ROOT / "tenants" / tenant / "assets" / "credentials"
    errors = 0

    if not cred_dir.exists():
        print(f"No credentials directory for tenant {tenant}")
        return 0

    for cred_file in cred_dir.glob("*.credential.yaml"):
        try:
            data = yaml.safe_load(cred_file.read_text())
            validate(instance=data, schema=schema)
            print(f"  OK: {cred_file.name}")
        except ValidationError as e:
            print(f"  FAIL: {cred_file.name} — {e.message}")
            errors += 1
        except Exception as e:
            print(f"  ERROR: {cred_file.name} — {e}")
            errors += 1

    return errors


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate credential YAML specs")
    parser.add_argument("--tenant", required=True, help="Tenant slug")
    args = parser.parse_args()

    errors = validate_credentials(args.tenant)
    if errors:
        print(f"\n{errors} credential validation error(s)")
        sys.exit(1)
    print("\nAll credentials valid.")
