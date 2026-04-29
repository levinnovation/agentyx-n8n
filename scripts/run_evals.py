"""Run evaluation suite (stub)."""

import typer

app = typer.Typer()


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
    asset: str = typer.Option(..., "--asset", "-a"),
):
    typer.echo("Running evals: TODO")


if __name__ == "__main__":
    app()
