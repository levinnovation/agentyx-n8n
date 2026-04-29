"""Compile a capability spec into a deployment bundle."""

from pathlib import Path
import typer
import yaml

app = typer.Typer()
ROOT = Path(__file__).resolve().parent.parent


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
):
    cap_path = (
        ROOT
        / "tenants"
        / tenant
        / "domains"
        / domain
        / "capabilities"
        / capability
        / "capability.yaml"
    )
    if not cap_path.exists():
        typer.echo(f"Capability not found: {cap_path}")
        raise typer.Exit(1)
    spec = yaml.safe_load(cap_path.read_text())
    typer.echo(f"Capability {capability} compiled. Assets: {spec.get('assets', [])}")


if __name__ == "__main__":
    app()
