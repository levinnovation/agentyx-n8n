"""Compile a LangGraph asset (stub)."""

from pathlib import Path
import typer

app = typer.Typer()
ROOT = Path(__file__).resolve().parent.parent


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
    asset: str = typer.Option(..., "--asset", "-a"),
):
    asset_path = ROOT / "tenants" / tenant / "assets" / "agents" / asset
    typer.echo(f"Compiled LangGraph asset at {asset_path}")


if __name__ == "__main__":
    app()
