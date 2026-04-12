---
name: menuyukti-repo-orientation
description: >-
  Monorepo map for Menuyukti: which app owns persistence and APIs, where migrations live, when to use
  pnpm (Node/TypeScript) versus uv (Python), and where to find per-app skills. Use for onboarding,
  "where does X belong?", Turbo workspaces, or avoiding wrong package manager or database layer.
---

# Menuyukti: repository orientation

This skill is for **Cursor/agents** navigating the repo. It is **not** a runtime milestone skill under `packages/agent-skills/` (those feed `skill_runner` in `apps/agents`).

## Service map

| Area                 | Path           | Role                                                                                                                                                                                                                                   |
| -------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web**              | `apps/web`     | Next.js UI: chat, campaigns, CRUD. **Reads/writes go through GraphQL** (not direct DB). Workflow roots use GraphQL **`nodeType` `workflow`**.                                                                                          |
| **GraphQL API**      | `apps/graphql` | Strawberry schema, **SQLAlchemy persistence**, analytics. **Single HTTP API** for structured data used by web and agents.                                                                                                              |
| **LangGraph agents** | `apps/agents`  | FastAPI, LangChain / LangGraph. **Calls GraphQL over HTTP** (e.g. `httpx`); **does not** open database connections.                                                                                                                    |
| **Shared packages**  | `packages/*`   | Shared TypeScript libraries; Python: [`packages/menuyukti`](../../../packages/menuyukti) (analytics), [`packages/agent-skills`](../../../packages/agent-skills) (runtime milestone `SKILL.md` for prepare), per root workspace config. |

```mermaid
flowchart LR
  web["apps/web"]
  gql["apps/graphql"]
  ag["apps/agents"]
  web -->|"GraphQL HTTP"| gql
  ag -->|"GraphQL HTTP"| gql
```

## Domain skills (go deeper)

| Skill                                                    | When to open it                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`menuyukti-agents`](../menuyukti-agents/SKILL.md)       | `apps/agents`: FastAPI, LangGraph, skill_runner, milestone prepare, prefetch, runtime `SKILL.md`. |
| [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md)     | `apps/graphql`: Strawberry, Alembic, resolvers, queries for web/agents.                           |
| [`menuyukti-web`](../menuyukti-web/SKILL.md)             | `apps/web`: Next.js, Clerk, next-intl, GraphQL from the browser/BFF, milestone UI.                |
| [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md) | `packages/menuyukti`: pandas pipelines, Instagram signals, GraphQL `transform` integration.       |

## Cross-app flow: milestone Prepare (skill_runner)

When a milestone **Data** task uses **Prepare**, the web app streams to agents; agents prefetch via GraphQL, run the LLM, then persist milestonedata. Details are split across the three app skills—this is only the map.

```mermaid
flowchart LR
  subgraph webLayer [apps_web]
    Card[Milestone_Data_tab]
    Task[dataTask_select]
  end
  subgraph agentsLayer [apps_agents]
    Prepare[POST_prepare_SSE]
    SR[skill_runner]
    GC[graphql_client]
  end
  subgraph gqlLayer [apps_graphql]
    API[Strawberry_API]
  end
  Card --> Task
  Card --> Prepare
  Prepare --> SR
  SR --> GC
  GC -->|"graphql_post"| API
```

- **Web:** UI enums, BFF, next-intl — [`menuyukti-web`](../menuyukti-web/SKILL.md).
- **Agents:** `skill_runner`, handlers, runtime `SKILL.md` under `packages/agent-skills` — [`menuyukti-agents`](../menuyukti-agents/SKILL.md).
- **GraphQL:** queries and resolvers backing prefetch — [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md).
- **Heavy analytics:** [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md) + thin GraphQL layer.

## Database ownership

- **Schema, migrations, and SQLAlchemy** live **only** in **`apps/graphql`**.
- **`apps/web`** and **`apps/agents`** must **not** add DB drivers, connection strings for app data, or migration scripts for product data.
- Turbo may expose `db:*` scripts when the GraphQL package defines them; **ownership** stays in GraphQL — see [AGENTS.md](../../../AGENTS.md) and `apps/graphql` README / Makefile.

## pnpm versus uv

| Use                   | Tool     | Scope                                                                                          |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| **Node / TypeScript** | **pnpm** | Workspaces `apps/*`, `packages/*`; root scripts (`pnpm build`, `pnpm lint`, …). Node **>=20**. |
| **Python**            | **uv**   | Root `pyproject.toml` workspace; `uv sync`, `uv run`, `uv add` from repo root or app dirs.     |

**Do not** suggest `npm` or `yarn` for installs, or ad-hoc `pip install` as the default workflow.

## Canonical references

- [AGENTS.md](../../../AGENTS.md) — commands, ports, layout table.
- [`.cursor/rules/project-overview.mdc`](../../../.cursor/rules/project-overview.mdc) — product context and layering.
- [`.cursor/rules/monorepo-conventions.mdc`](../../../.cursor/rules/monorepo-conventions.mdc) — pnpm, Turbo, uv, formatting.
- [`.agents/skills/turborepo/SKILL.md`](../turborepo/SKILL.md) — Turbo pipelines, caching, `--filter`.

## Non-goals

- **Duplicating** full command matrices — link **AGENTS.md** instead.
- **Per-app implementation detail** — use the domain skills above.

## Progressive disclosure

If this file grows, split long reference material into `reference.md` in this folder.
