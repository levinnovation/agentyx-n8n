"""Scaffold a new domain inside a tenant."""

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
):
    src = TENANTS / tenant / "domains" / "example-domain"
    dst = TENANTS / tenant / "domains" / domain
    if not src.exists():
        typer.echo("Template domain not found. Run scaffold-tenant first.")
        raise typer.Exit(1)
    if dst.exists():
        typer.echo(f"Domain {domain} already exists.")
        raise typer.Exit(1)
    copy_tree(src, dst)
    typer.echo(f"Scaffolded domain: {dst}")


if __name__ == "__main__":
    app()
