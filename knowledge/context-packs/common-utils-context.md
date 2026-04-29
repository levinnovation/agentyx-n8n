# Common utils context pack

## Purpose

`common/utils/` (when added) holds **shared operator tooling**: CLIs, validators, generators—**not** tenant business logic.

## Rules

- **No tenant-specific rules** inside shared utils unless passed as parameters (tenant slug, paths, config files).
- Prefer **Typer** CLIs, **pathlib**, **rich** output, **httpx** for HTTP—see `AGENTS.md` / coding standards rule.
- Document new utilities in `CONTRIBUTING.md` or `knowledge/change-log/` as appropriate.

## Current state

This repository may not yet have `common/utils/`; ADR-0004 reserves the pattern. When the first utility lands, update this pack and `make validate` if new checks are added.
