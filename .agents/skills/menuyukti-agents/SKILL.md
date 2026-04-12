---
name: menuyukti-agents
description: >-
  LangGraph agents app (apps/agents): FastAPI, milestone run LangGraph (skill selection + ReAct + eval),
  milestone_run SKILL.md under apps/agents, graphql_post. Use when adding milestone tools, graphs,
  routers, or agents-side GraphQL clients.
---

# Menuyukti: `apps/agents`

Python **FastAPI** service: LangChain / LangGraph and streaming chat. **`POST /milestones/{id}/run`** drives the milestone agent (fetch context → structured skill selection → ReAct with tools → shared eval graph). Agents call **GraphQL over HTTP** only.

For monorepo boundaries and pnpm vs uv, see [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md).

## Companion skills

When implementing in **`apps/agents`**, follow these skills in addition to this doc and [`.cursor/rules/langgraph.mdc`](../../../.cursor/rules/langgraph.mdc) / [`.cursor/rules/langchain.mdc`](../../../.cursor/rules/langchain.mdc):

- [`langgraph-fundamentals`](../langgraph-fundamentals/SKILL.md) — LangGraph: graphs, state, nodes, streaming, Command.
- [`langchain-fundamentals`](../langchain-fundamentals/SKILL.md) — LangChain agents, tools, middleware.
- [`python-design-patterns`](../python-design-patterns/SKILL.md) — Structure, layering, composition.

## Layout

| Area           | Path                                                                                          | Role                                                                      |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Milestone run  | [`apps/agents/agents/core/milestone_run/`](../../../apps/agents/agents/core/milestone_run/)   | LangGraph graph, tools, streaming SSE adapter, `skills/<id>/SKILL.md`.    |
| Milestone eval | [`apps/agents/agents/core/milestone_eval/`](../../../apps/agents/agents/core/milestone_eval/) | Criterion loop + synthesis; used only from milestone run `finalize_eval`. |
| Milestone data | [`apps/agents/agents/core/milestone_data/`](../../../apps/agents/agents/core/milestone_data/) | Persist milestonedata Markdown (GraphQL upsert).                          |
| Chat           | [`apps/agents/agents/core/chat/`](../../../apps/agents/agents/core/chat/)                     | Streaming chat graph.                                                     |
| Routers        | [`apps/agents/routers/`](../../../apps/agents/routers/)                                       | FastAPI routes (`chat`, `milestone_run`, `format-markdown`, …).           |
| GraphQL helper | [`apps/agents/agents/graphql_base.py`](../../../apps/agents/agents/graphql_base.py)           | `graphql_post`; env `GRAPHQL_ENDPOINT`, optional internal API key.        |
| Tests          | [`apps/agents/tests/core/`](../../../apps/agents/tests/core/)                                 | Pytest for graphs, tools, stream adapter.                                 |

Commands and ports: [AGENTS.md](../../../AGENTS.md).

## Runtime `SKILL.md` (milestone run)

Skills live under [`milestone_run/skills/<skill_id>/SKILL.md`](../../../apps/agents/agents/core/milestone_run/skills/). [`get_milestone_run_skill_path`](../../../apps/agents/agents/core/milestone_run/skill_paths.py) resolves that path. [`load_skill_markdown`](../../../apps/agents/agents/core/milestone_run/skill_markdown.py) parses YAML frontmatter (`name`, `description`) and markdown body.

Register each skill in [`skills.py`](../../../apps/agents/agents/core/milestone_run/skills.py) (`SKILL_REGISTRY`). Shared LangChain tools are built in [`tools.py`](../../../apps/agents/agents/core/milestone_run/tools.py) (`make_milestone_run_tools`).

## Checklist (agents-only)

1. **`graphql_post`** — correct env and headers in [`graphql_base.py`](../../../apps/agents/agents/graphql_base.py).
2. **New skill** — add `SKILL.md`, register in `skills.py`, extend tools in `tools.py` / GraphQL in `milestone_run/graphql_client.py` if new data is needed.
3. **Persistence** — Data tab writes go through `write_result_data` → `milestone_data` upsert.

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
