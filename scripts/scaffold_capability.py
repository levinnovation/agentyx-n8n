"""Scaffold a new capability inside a domain."""

from pathlib import Path
import typer
from lib.file_ops import copy_tree

app = typer.Typer()
ROOT = Path(__file__).resolve().parent.parent
TENANTS = ROOT / "tenants"


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
):
    src = TENANTS / tenant / "domains" / domain / "capabilities" / "example-capability"
    dst = TENANTS / tenant / "domains" / domain / "capabilities" / capability
    if not src.exists():
        typer.echo("Template capability not found.")
        raise typer.Exit(1)
    if dst.exists():
        typer.echo(f"Capability {capability} already exists.")
        raise typer.Exit(1)
    copy_tree(src, dst)
    typer.echo(f"Scaffolded capability: {dst}")


if __name__ == "__main__":
    app()
