"""Export n8n workflows (stub)."""

import typer

app = typer.Typer()


@app.command()
def main(
    url: str = typer.Option("http://localhost:5678", "--url", "-u"),
    api_key: str = typer.Option(..., "--api-key", "-k"),
):
    typer.echo("Export n8n workflows: TODO")


if __name__ == "__main__":
    app()
