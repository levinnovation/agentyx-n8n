# Lesson 0001: Do not let runtime tools become the architecture

**Summary:** LangGraph, n8n, WhatsApp vendors, etc. are **implementation**. The architecture is **tenant → domain → capability → assets**.

**Signal:** Top-level folders like `agents/` or “workflow repo” thinking.

**Remedy:** Re-home artifacts under the owning capability; document in an ADR if the mistake was structural.
