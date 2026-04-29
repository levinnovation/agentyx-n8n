# 0001: From agent-centric to domain-centric

## Before

Repositories organized around **agents**, **workflows**, or **bots** as top-level concepts. Business ownership was implicit and cross-cutting concerns leaked across folders.

## After

**Domains** and **capabilities** own work. Agents and workflows are **assets** that realize capabilities under `tenants/{tenant}/`.

## Why it matters

Agents are implementation choices; the business capability is the stable unit of design, testing, and governance.
