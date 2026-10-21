# Menuyukti

Agentic AI platform for restaurant marketing and operations — a monorepo built with a Cursor-style agentic coding setup.

## What it is

Operators work **chat-first** (`/advisor`) with mode-driven assistants (`general`, `image_assistant`, `inventar`), plus analytics, **native POS**, inventory, media, IG Studio, calendar, and CRM. Guests use a **web PWA**. GraphQL is the single source of truth; LangGraph agents call it over HTTP.

## Stack

| Area      | Path                 | Role                                         |
| --------- | -------------------- | -------------------------------------------- |
| Web       | `apps/web`           | Next.js — operator shell + customer PWA      |
| API       | `apps/graphql`       | Strawberry GraphQL, SQLAlchemy, Alembic      |
| Agents    | `apps/agents`        | FastAPI + LangChain/LangGraph streaming chat |
| Analytics | `packages/menuyukti` | Sales / Instagram analytics pipelines        |

## Agentic coding setup

Agent-first workflow for this monorepo:

- **Cursor rules** (`.cursor/rules/`) — product map, monorepo conventions, LangGraph/LangChain, web & GraphQL boundaries
- **Domain skills** (`.agents/skills/menuyukti-*`) — where features live, how agents/web/GraphQL talk, POS readiness & GraphQL security audits
- **Feature glossary** (`.agents/menuyukti-features.md`) — paths and symbols for navigating a large codebase
- **Stack skills** — Next.js, Clerk, shadcn, SQLAlchemy, LangGraph, Turborepo, and more

The product uses the same patterns: mode-bound tools, checkpointer threads, GraphQL tools, and generate → critique → revise for style/spec drafts.

## Notable product surfaces

- Chat advisor with streaming ReAct agents and tool calling into GraphQL
- Native POS cashier (tax / fiscalization hooks) scoped by location
- Inventory chat mode with refill-forecast tools
- Public location hub + explore (customer PWA)

Expo (`apps/mobile-app`) remains in the repo but is inactive; customer focus is the web PWA.
