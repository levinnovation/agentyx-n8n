"""Deploy an asset (stub)."""

import typer

app = typer.Typer()


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
    asset: str = typer.Option(..., "--asset", "-a"),
    env: str = typer.Option("dev", "--env", "-e"),
):
    typer.echo(f"Deploy {asset} to {env}: TODO")


if __name__ == "__main__":
    app()
