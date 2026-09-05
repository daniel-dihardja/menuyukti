---
name: menuyukti-agents
description: >-
  LangGraph agents app (apps/agents): FastAPI, streaming chat ReAct (general +
  image_assistant modes), graphql_post, format-markdown helper. Use when adding
  chat tools, routers, or agents-side GraphQL clients.
---

# Menuyukti: `apps/agents`

Python **FastAPI** service: LangChain / LangGraph **streaming chat** only. **`POST /chat`** runs a ReAct graph keyed by **`agent_thread_id`** (modes: `general` | `image_assistant`; legacy alias `story_image_assistant`). Agents call **GraphQL over HTTP** only — no direct DB. Default LLM via Vercel AI Gateway (`openai/gpt-5.4` unless `OPENAI_MODEL` overrides).

For monorepo boundaries and pnpm vs uv, see [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md).

## Companion skills

When implementing in **`apps/agents`**, follow these skills in addition to this doc and [`.cursor/rules/langgraph.mdc`](../../../.cursor/rules/langgraph.mdc) / [`.cursor/rules/langchain.mdc`](../../../.cursor/rules/langchain.mdc):

- [`langgraph-fundamentals`](../langgraph-fundamentals/SKILL.md) — LangGraph: graphs, state, nodes, streaming, Command, Send.
- [`langchain-fundamentals`](../langchain-fundamentals/SKILL.md) — LangChain agents, tools, middleware.
- [`python-design-patterns`](../python-design-patterns/SKILL.md) — Structure, layering, composition.

## Layout

| Area           | Path                                                                                            | Role                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Chat           | [`apps/agents/agents/core/chat/`](../../../apps/agents/agents/core/chat/)                       | `compile_chat_graph` / `create_agent` ReAct + checkpointer; modes, tools, story scratchpad. |
| Format MD      | [`apps/agents/agents/core/format_markdown/`](../../../apps/agents/agents/core/format_markdown/) | Preset-driven Markdown cleanup (`POST /format-markdown`).                                    |
| Style spec     | [`apps/agents/agents/core/style_spec/`](../../../apps/agents/agents/core/style_spec/)           | Vision draft helpers for IG Studio styles.                                                   |
| LLM helpers    | [`apps/agents/agents/core/llm_invoke.py`](../../../apps/agents/agents/core/llm_invoke.py)       | Retries + structured-output errors.                                                          |
| AI usage       | [`apps/agents/agents/core/ai_usage_client.py`](../../../apps/agents/agents/core/ai_usage_client.py) | GraphQL metering for LLM / feature usage.                                               |
| Web search     | [`apps/agents/agents/core/tavily_search_tool.py`](../../../apps/agents/agents/core/tavily_search_tool.py) | Optional `search_web` when `TAVILY_API_KEY` is set.                                 |
| Routers        | [`apps/agents/routers/`](../../../apps/agents/routers/)                                         | FastAPI routes (`chat`, `format-markdown`, `style_specs`).                                   |
| GraphQL helper | [`apps/agents/agents/graphql_base.py`](../../../apps/agents/agents/graphql_base.py)             | `graphql_post` (retry on transient failures).                                                |
| GraphQL ops    | [`apps/agents/agents/graphql_operations.py`](../../../apps/agents/agents/graphql_operations.py) | Query/mutation documents used by tools.                                                      |
| Errors / trace | [`errors.py`](../../../apps/agents/agents/errors.py), [`tracing.py`](../../../apps/agents/agents/tracing.py) | SSE error payloads; LangSmith / `traceparent`.                                      |
| LLM config     | [`apps/agents/models/llm_config.py`](../../../apps/agents/models/llm_config.py)                 | AI Gateway `ChatOpenAI` factories + reporting extras.                                        |
| Tests          | [`apps/agents/tests/core/`](../../../apps/agents/tests/core/)                                   | Pytest for chat graph, tools, routers.                                                       |

Chat helpers under `core/chat/` also include `tools_registry.py`, `middleware.py`, `sse_stream.py`, `chat_run_config.py`, `limits.py`, `allowed_models.py`, `story_assets.py`, `history_messages.py`, `http_context.py`, `chart_data.py`, `present_weekly_instagram_schedule.py`, `generate_instagram_post_image.py`, and `generate_confirmation_gate.py`.

Commands and ports: [AGENTS.md](../../../AGENTS.md).

## Chat (primary product surface)

- **Identity:** `agent_thread_id` (required). Optional `location_id` for location/chart tools; optional `analytics_run_id` for chart tools.
- **Modes:** `general` (media, weekly schedule, optional location/charts/web search/IG generate) and `image_assistant` (media + story scratchpad + confirmation + IG image generate; format from UI).
- **Graph:** [`chat/graph.py`](../../../apps/agents/agents/core/chat/graph.py) — `compile_chat_graph` / `create_agent`; tools in [`chat/tools.py`](../../../apps/agents/agents/core/chat/tools.py) plus related modules. Middleware: dynamic prompt, model/tool selection + history trim, model retry, AI usage recording, `wrap_tool_call` error handling. `CHAT_RECURSION_LIMIT` (20) is applied on the router runnable config.
- **History:** `GET` / `DELETE /chat/history` by `agent_thread_id` (Postgres checkpointer when configured; required in production).
- **Auth:** routers require `X-Menuyukti-User-Id`; when `INTERNAL_API_KEY` or `GRAPHQL_INTERNAL_API_KEY` is set, inbound requests (except `GET /health`) need matching `X-Internal-Api-Key`. Outbound GraphQL / web generate use the same shared-secret resolution.
- **Web BFF:** `apps/web` `/api/chat` forwards to this service with Clerk user id.
- **Image Assistant confirmation:** `request_story_generate_confirmation` is a **UI-signaling tool** (not LangGraph `interrupt()` HITL). The web UI shows Generate/Change; [`generate_confirmation_gate.py`](../../../apps/agents/agents/core/chat/generate_confirmation_gate.py) enforces confirm-before-first-generate in code. Refine after a successful generate is allowed.

There is **no** live milestone-run / preset-registry API. Do not add `POST /milestones/.../run` or preset subgraphs as product features.

## Format markdown

`POST /format-markdown` accepts `{"content":"...","preset":"..."}`. Prefer preset **`notes`**; legacy alias **`milestone-data`** still works. Platform helper only — not a campaign pipeline.

## Tracing

- **LangSmith:** `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, optional `LANGCHAIN_PROJECT`.
- **Distributed traces:** web BFF forwards `traceparent` to agents when present.

See [`apps/agents/README.md`](../../../apps/agents/README.md) and [`.env.example`](../../../apps/agents/.env.example) for env vars.

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
- [`.cursor/rules/agents-conventions.mdc`](../../../.cursor/rules/agents-conventions.mdc)
