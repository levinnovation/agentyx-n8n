"""Validate all tenant specs: YAML parse, asset.yaml presence, and JSON parse."""

import json
import sys
from pathlib import Path

import yaml
from rich.console import Console
from rich.tree import Tree

ROOT = Path(__file__).resolve().parent.parent
TENANTS_DIR = ROOT / "tenants"
console = Console()


def main():
    tree = Tree("[bold]Vertical Assets[/bold]")
    errors = []

    if not TENANTS_DIR.exists():
        console.print("[red]No tenants directory found[/red]")
        sys.exit(1)

    for tenant_path in sorted(TENANTS_DIR.iterdir()):
        if not tenant_path.is_dir():
            continue
        tenant_node = tree.add(f"[bold cyan]Tenant: {tenant_path.name}[/bold cyan]")

        tenant_yaml = tenant_path / "tenant.yaml"
        if not tenant_yaml.exists():
            errors.append(f"missing {tenant_yaml.relative_to(ROOT)}")
        else:
            try:
                yaml.safe_load(tenant_yaml.read_text())
            except Exception as e:
                errors.append(f"invalid YAML {tenant_yaml.relative_to(ROOT)}: {e}")

        domains_dir = tenant_path / "domains"
        if domains_dir.exists():
            for domain_path in sorted(domains_dir.iterdir()):
                if not domain_path.is_dir():
                    continue
                domain_node = tenant_node.add(f"[green]Domain: {domain_path.name}[/green]")

                domain_yaml = domain_path / "domain.yaml"
                if not domain_yaml.exists():
                    errors.append(f"missing {domain_yaml.relative_to(ROOT)}")
                else:
                    try:
                        yaml.safe_load(domain_yaml.read_text())
                    except Exception as e:
                        errors.append(f"invalid YAML {domain_yaml.relative_to(ROOT)}: {e}")

                caps_dir = domain_path / "capabilities"
                if caps_dir.exists():
                    for cap_path in sorted(caps_dir.iterdir()):
                        if not cap_path.is_dir():
                            continue
                        cap_node = domain_node.add(f"[yellow]Capability: {cap_path.name}[/yellow]")

                        cap_yaml = cap_path / "capability.yaml"
                        if not cap_yaml.exists():
                            errors.append(f"missing {cap_yaml.relative_to(ROOT)}")
                        else:
                            try:
                                yaml.safe_load(cap_yaml.read_text())
                            except Exception as e:
                                errors.append(f"invalid YAML {cap_yaml.relative_to(ROOT)}: {e}")

        assets_dir = tenant_path / "assets"
        if assets_dir.exists():
            assets_node = tenant_node.add("[magenta]Assets[/magenta]")
            for asset_type_dir in sorted(assets_dir.iterdir()):
                if not asset_type_dir.is_dir():
                    continue
                type_node = assets_node.add(f"[dim]{asset_type_dir.name}[/dim]")
                for asset_path in sorted(asset_type_dir.iterdir()):
                    if not asset_path.is_dir():
                        continue
                    asset_node = type_node.add(asset_path.name)
                    asset_yaml = asset_path / "asset.yaml"
                    if asset_yaml.exists():
                        try:
                            yaml.safe_load(asset_yaml.read_text())
                        except Exception as e:
                            errors.append(f"invalid YAML {asset_yaml.relative_to(ROOT)}: {e}")
                    # Validate all nested YAML and JSON
                    for yf in asset_path.rglob("*.yaml"):
                        try:
                            yaml.safe_load(yf.read_text())
                        except Exception as e:
                            errors.append(f"invalid YAML {yf.relative_to(ROOT)}: {e}")
                    for jf in asset_path.rglob("*.json"):
                        try:
                            json.loads(jf.read_text())
                        except Exception as e:
                            errors.append(f"invalid JSON {jf.relative_to(ROOT)}: {e}")

    console.print(tree)
    if errors:
        console.print("\n[red]Errors:[/red]")
        for e in errors:
            console.print(f"  [red]-[/red] {e}")
        sys.exit(1)
    else:
        console.print("\n[bold green]All specs valid.[/bold green]")
        sys.exit(0)


if __name__ == "__main__":
    main()
