# Lesson 0004: Agent context must be versioned, not retyped

**Summary:** Do not repeatedly re-explain architecture to every AI session. Stable instructions belong in `AGENTS.md`, `knowledge/context-packs/`, and tool-specific context files.

**Signal:** Long identical preambles across sessions; inconsistent agent behavior across contributors.

**Remedy:** Update repo-native context when the law changes; run `scripts/validate_agent_context.py` in CI via `make validate`.
