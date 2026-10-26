# Menuyukti

Agentic AI platform for restaurant marketing and operations — a monorepo built with a Cursor-style agentic coding setup.

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

## Notable product surfaces

- Chat advisor with streaming ReAct agents and tool calling into GraphQL
- Digital-menu Order board (guest submit + staff prep lifecycle; tickets persist as GraphQL `PosOrder`)
- Inventory chat mode with refill-forecast tools
- Public location hub + explore (customer PWA)

Expo (`apps/mobile-app`) remains in the repo but is inactive; customer focus is the web PWA.
