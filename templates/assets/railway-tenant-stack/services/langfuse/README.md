# Langfuse

LLM observability and tracing platform.

## Image

`ghcr.io/langfuse/langfuse:latest` (pin to a specific version in production)

## Ports

- `3000` — Web UI and API

## Environment

See `.env.example` for required variables.

## First-run init

Langfuse auto-creates the org, project, and admin user on first boot when `LANGFUSE_INIT_*` variables are set.

## Agent integration

The `agent` service sends traces to Langfuse via the `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` variables (LangSmith-compatible env vars used by LangGraph). Langfuse is configured as the trace sink.
