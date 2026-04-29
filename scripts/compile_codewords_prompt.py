"""Compile codewords prompt for a capability."""

import typer

app = typer.Typer()


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    domain: str = typer.Option(..., "--domain", "-d"),
    capability: str = typer.Option(..., "--capability", "-c"),
):
    typer.echo(f"Codewords prompt compiled for {tenant}/{domain}/{capability}")


if __name__ == "__main__":
    app()
