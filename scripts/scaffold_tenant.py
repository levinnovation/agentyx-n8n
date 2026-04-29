"""Scaffold a new tenant from the generic template."""

from pathlib import Path
import typer
from lib.file_ops import copy_tree

app = typer.Typer()
ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
TENANTS = ROOT / "tenants"


@app.command()
def main(tenant: str = typer.Option(..., "--tenant", "-t")):
    src = TEMPLATES / "tenant"
    dst = TENANTS / tenant
    if dst.exists():
        typer.echo(f"Tenant {tenant} already exists.")
        raise typer.Exit(1)
    copy_tree(src, dst)
    typer.echo(f"Scaffolded tenant: {dst}")


if __name__ == "__main__":
    app()
