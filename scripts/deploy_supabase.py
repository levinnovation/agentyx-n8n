"""Deploy Supabase functions (stub)."""

import typer

app = typer.Typer()


@app.command()
def main(
    tenant: str = typer.Option(..., "--tenant", "-t"),
    project_ref: str = typer.Option(..., "--project-ref", "-p"),
):
    typer.echo(f"Deploy Supabase functions for {tenant}: TODO")


if __name__ == "__main__":
    app()
