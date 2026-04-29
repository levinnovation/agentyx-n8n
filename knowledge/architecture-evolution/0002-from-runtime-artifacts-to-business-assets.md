# 0002: From runtime artifacts to business assets

## Before

Runtime artifacts (graphs, JSON exports, adapters) were treated as the source of truth, sometimes edited only in vendor UIs.

## After

Artifacts are **versioned files** in Git: prompts as `.md`, n8n JSON in-repo, `asset.yaml` for metadata, policies and contracts alongside assets.

## Why it matters

Git remains the system of record; runtime is a consumer of declared assets.
