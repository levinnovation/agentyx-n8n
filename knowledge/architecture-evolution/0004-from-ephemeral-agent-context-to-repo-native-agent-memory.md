# 0004: From ephemeral agent context to repo-native agent memory

## Before

Earlier work depended on **conversational context** inside AI tools. Each session re-explained hierarchy, forbidden folders, and validation commands.

## After

The repo **externalizes** agent instructions into versioned files:

- `AGENTS.md` at repo root
- Tool-specific files (Cursor, Claude Code, OpenCode, Open Codex, Copilot)
- `knowledge/context-packs/` for reusable bootstrap text

Future coding agents can **bootstrap from the repository** instead of relying on chat history.

## Why it matters

Smaller prompts, less drift, cheaper sessions, more consistent codegen—at the cost of maintaining those files when the law changes.
