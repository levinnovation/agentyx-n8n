"""Scaffold a new asset inside a tenant."""

import shutil
from pathlib import Path
import typer

app = typer.Typer()
ROOT = Path(__file__).resolve().parent.parent
TENANTS = ROOT / "tenants"
TEMPLATES = ROOT / "templates" / "assets"

ASSET_TYPES = {
    "langgraph": "langgraph-agent",
    "n8n": "n8n-workflow",
    "whatsapp": "whatsapp-kapso-channel",
    "supabase": "supabase-infra",
    "deployment": "deployment",
}


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
    asset: str = typer.Option(..., "--asset", "-a"),
    type: str = typer.Option(..., "--type", "-T"),
):
    template_name = ASSET_TYPES.get(type)
    if not template_name:
        typer.echo(f"Unknown asset type: {type}. Choose from {list(ASSET_TYPES.keys())}")
        raise typer.Exit(1)
    src = TEMPLATES / template_name
    if not src.exists():
        typer.echo(f"Template {template_name} not found.")
        raise typer.Exit(1)

    dst = TENANTS / tenant / "assets" / template_name / asset
    dst.mkdir(parents=True, exist_ok=True)

    for item in src.iterdir():
        if item.is_dir():
            shutil.copytree(item, dst / item.name, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dst / item.name)

    typer.echo(f"Scaffolded asset: {dst}")


if __name__ == "__main__":
    app()
