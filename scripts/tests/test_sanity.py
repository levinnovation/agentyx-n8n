"""Sanity tests for the vertical-assets toolchain."""

from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent.parent.parent


def test_tenant_yaml_parses():
    tenant_yaml = ROOT / "tenants" / "euromobilia" / "tenant.yaml"
    assert tenant_yaml.exists()
    data = yaml.safe_load(tenant_yaml.read_text())
    assert data["id"] == "euromobilia"


def test_all_yaml_parse():
    errors = []
    for p in ROOT.rglob("*.yaml"):
        try:
            yaml.safe_load(p.read_text())
        except Exception as e:
            errors.append(f"{p}: {e}")
    assert not errors, "\n".join(errors)
