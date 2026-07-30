---
name: menuyukti-agents
description: >-
  LangGraph agents app (apps/agents): FastAPI, streaming chat ReAct (general + story modes),
  graphql_post, format-markdown helper. Use when adding chat tools, routers, or agents-side GraphQL clients.
---

# Menuyukti: `apps/agents`

Python **FastAPI** service: LangChain / LangGraph **streaming chat** only. **`POST /chat`** runs a ReAct graph keyed by **`agent_thread_id`** (modes: `general` | `image_assistant`). Agents call **GraphQL over HTTP** only — no direct DB.

For monorepo boundaries and pnpm vs uv, see [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md).

## Companion skills

When implementing in **`apps/agents`**, follow these skills in addition to this doc and [`.cursor/rules/langgraph.mdc`](../../../.cursor/rules/langgraph.mdc) / [`.cursor/rules/langchain.mdc`](../../../.cursor/rules/langchain.mdc):

- [`langgraph-fundamentals`](../langgraph-fundamentals/SKILL.md) — LangGraph: graphs, state, nodes, streaming, Command, Send.
- [`langchain-fundamentals`](../langchain-fundamentals/SKILL.md) — LangChain agents, tools, middleware.
- [`python-design-patterns`](../python-design-patterns/SKILL.md) — Structure, layering, composition.

## Layout

| Area           | Path                                                                                            | Role                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Chat           | [`apps/agents/agents/core/chat/`](../../../apps/agents/agents/core/chat/)                       | `create_agent` ReAct + checkpointer; modes, tools, story scratchpad; `CHAT_RECURSION_LIMIT`. |
| Format MD      | [`apps/agents/agents/core/format_markdown/`](../../../apps/agents/agents/core/format_markdown/) | Preset-driven Markdown cleanup (`POST /format-markdown`).                                    |
| Style spec     | [`apps/agents/agents/core/style_spec/`](../../../apps/agents/agents/core/style_spec/)           | Vision draft helpers for IG Studio styles.                                                   |
| LLM helpers    | [`apps/agents/agents/core/llm_invoke.py`](../../../apps/agents/agents/core/llm_invoke.py)       | Retries + structured-output errors.                                                          |
| Routers        | [`apps/agents/routers/`](../../../apps/agents/routers/)                                         | FastAPI routes (`chat`, `format-markdown`, `style_specs`, …).                                |
| GraphQL helper | [`apps/agents/agents/graphql_base.py`](../../../apps/agents/agents/graphql_base.py)             | `graphql_post` (with retry on transient failures).                                           |
| Tests          | [`apps/agents/tests/core/`](../../../apps/agents/tests/core/)                                   | Pytest for chat graph, tools, routers.                                                       |

Commands and ports: [AGENTS.md](../../../AGENTS.md).

## Chat (primary product surface)

- **Identity:** `agent_thread_id` (required). Optional `location_id` for location/chart tools.
- **Modes:** `general` (location, charts, media, optional web search) and `image_assistant` (media + story scratchpad + IG image generate; format from UI).
- **Graph:** [`chat/graph.py`](../../../apps/agents/agents/core/chat/graph.py) — `build_chat_graph` / `create_agent`; tools in [`chat/tools.py`](../../../apps/agents/agents/core/chat/tools.py).
- **History:** `GET` / `DELETE /chat/history` by `agent_thread_id` (Postgres checkpointer when configured).
- **Web BFF:** `apps/web` `/api/chat` forwards to this service with Clerk user id.

There is **no** live milestone-run / preset-registry API. Do not add `POST /milestones/.../run` or preset subgraphs as product features.

## Format markdown

`POST /format-markdown` accepts `{"content":"...","preset":"..."}` (e.g. leftover preset name `milestone-data`) and returns cleaned Markdown. Platform helper only — not a campaign pipeline.

## Tracing

- **LangSmith:** `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, optional `LANGCHAIN_PROJECT`.
- **Distributed traces:** web BFF forwards `traceparent` to agents when present.

See [`apps/agents/README.md`](../../../apps/agents/README.md) for env vars.

## Checklist (agents-only)

1. **`graphql_post`** — env and headers in [`graphql_base.py`](../../../apps/agents/agents/graphql_base.py).
2. **New chat tool** — register in `chat_tools_list` / ToolNode union; gate by mode/config as needed.
3. **Tests** — chat graph / tool / router coverage under `tests/`.

## Related

| Topic             | Skill                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| GraphQL schema    | [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md)                   |
| Web UI            | [`menuyukti-web`](../menuyukti-web/SKILL.md)                           |
| Analytics package | [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md)               |
| Monorepo map      | [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md) |

## Canonical docs

- [`AGENTS.md`](../../../AGENTS.md)
- [`apps/agents/README.md`](../../../apps/agents/README.md)
