---
name: menuyukti-agents
description: >-
  LangGraph agents app (apps/agents): FastAPI routers, skill_runner milestone Prepare pipeline, prefetch
  handlers calling GraphQL, runtime SKILL.md under packages/agent-skills, graphql_post and env. Use when
  adding prefetch handlers, extending skill_runner, milestone prepare SSE, LangChain/LangGraph graphs, or
  agents-side GraphQL clients.
---

# Menuyukti: `apps/agents`

Python **FastAPI** service: LangChain / LangGraph, streaming chat, and **milestone Prepare** (`skill_runner`). Agents call **GraphQL over HTTP** only—no SQLAlchemy or app DB connections.

For monorepo boundaries and pnpm vs uv, see [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md).

## Companion skills

When implementing in **`apps/agents`**, follow these skills in addition to this doc and [`.cursor/rules/langgraph.mdc`](../../../.cursor/rules/langgraph.mdc) / [`.cursor/rules/langchain.mdc`](../../../.cursor/rules/langchain.mdc):

- [`langgraph-fundamentals`](../langgraph-fundamentals/SKILL.md) — LangGraph: graphs, state, nodes, streaming, Command.
- [`langchain-fundamentals`](../langchain-fundamentals/SKILL.md) — LangChain agents, tools, middleware.
- [`python-design-patterns`](../python-design-patterns/SKILL.md) — Structure, layering, composition.

## Layout

| Area           | Path                                                                                          | Role                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Domain graphs  | [`apps/agents/agents/`](../../../apps/agents/agents/)                                         | LangGraph graphs, co-located `prompts.py`, domain modules.                                |
| Skill runner   | [`apps/agents/agents/domain/skill_runner/`](../../../apps/agents/agents/domain/skill_runner/) | Load runtime `SKILL.md`, prefetch, Jinja human template, LLM stream.                      |
| Routers        | [`apps/agents/routers/`](../../../apps/agents/routers/)                                       | FastAPI routes (e.g. chat, milestone prepare).                                            |
| GraphQL helper | [`apps/agents/agents/graphql_base.py`](../../../apps/agents/agents/graphql_base.py)           | `graphql_post`; env `GRAPHQL_ENDPOINT`, optional `GRAPHQL_INTERNAL_API_KEY`, `X-User-Id`. |
| Milestone data | [`apps/agents/agents/core/milestone_data/`](../../../apps/agents/agents/core/milestone_data/) | Persist milestonedata Markdown after generation.                                          |
| Tests          | [`apps/agents/tests/`](../../../apps/agents/tests/)                                           | Pytest (e.g. `tests/domain/test_skill_runner.py`).                                        |

Commands and ports: [AGENTS.md](../../../AGENTS.md) § LangGraph agents.

## Runtime milestone `SKILL.md` (agent-skills package)

Milestone **Data** tasks that use **Prepare** load **`SKILL.md`** from [`packages/agent-skills/src/agent_skills/skills/<skill_id>/`](../../../packages/agent-skills/src/agent_skills/skills/) (resolved at runtime via `agent_skills.get_skill_path`). Examples: [`location_profile/SKILL.md`](../../../packages/agent-skills/src/agent_skills/skills/location_profile/SKILL.md), [`restaurant_brand_brief/SKILL.md`](../../../packages/agent-skills/src/agent_skills/skills/restaurant_brand_brief/SKILL.md).

### Loader contract

[`load_skill`](../../../apps/agents/agents/domain/skill_runner/loader.py) expects:

1. YAML **frontmatter** with `name`, `description`, and a **`menuyukti:`** mapping (required).
2. **Markdown body** after `---` — used as the **system** message to the LLM.

Minimal template (align `use` with real handlers in `PREFETCH_HANDLERS`):

```yaml
---
name: your-skill-id
description: >-
  One line: what the prepare step produces and when the milestone data task should use it.

menuyukti:
  version: 1

  human_message_template: |
    {# Jinja2: context.<id> matches each data_requirements[].id #}
    Your structured inputs (JSON):
    {{ context.my_data | tojson(indent=2) }}

    Produce the requested output in Markdown.

  data_requirements:
    - id: my_data
      use: your.namespace.handler_key
      inputs:
        location_id: '{{ env.location_id }}'
      required: true
---
You are a helpful assistant. Follow the product rules below.
```

### `menuyukti` fields

| Field                    | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `version`                | Must be `1` for the current loader.                                   |
| `human_message_template` | Jinja2; use `context.<id>` per prefetch result, `tojson` for objects. |
| `data_requirements`      | Ordered steps; each yields `context[id]`.                             |

### Each `data_requirements` entry

| Key        | Purpose                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Key into `context` for templates and prefetch SSE steps (`fetch_<id>`).                                                                                       |
| `use`      | Registry key in [`PREFETCH_HANDLERS`](../../../apps/agents/agents/domain/skill_runner/handlers.py). Must match an existing or new handler.                    |
| `inputs`   | Strings; may use `{{ env.milestone_id }}`, `{{ env.location_id }}`, `{{ env.user_id }}` — [`RunEnv`](../../../apps/agents/agents/domain/skill_runner/env.py). |
| `required` | If `true`, empty/falsy result raises before the LLM runs.                                                                                                     |

## Prefetch pipeline

- **Orchestration:** [`run_skill_events`](../../../apps/agents/agents/domain/skill_runner/runner.py) — prefetch → render `human_message_template` → LLM stream → [`persist_milestonedata_markdown`](../../../apps/agents/agents/core/milestone_data/). The model does **not** call a save tool; persistence runs after generation.
- **Prefetch steps:** [`prefetch.py`](../../../apps/agents/agents/domain/skill_runner/prefetch.py).
- **GraphQL calls:** [`graphql_client.py`](../../../apps/agents/agents/domain/skill_runner/graphql_client.py) (`fetch_*` helpers, `graphql_post`).

### Registered `use` keys (`PREFETCH_HANDLERS`)

| `use`                                   | Role                                                               |
| --------------------------------------- | ------------------------------------------------------------------ |
| `platform.location`                     | Location record for `location_id`.                                 |
| `platform.public_holidays`              | Holidays for country + date range.                                 |
| `platform.public_holidays_for_location` | Holidays for `location_id` date range (country from location).     |
| `analytics.latest_operating_profile`    | Latest analytics run + operating profile for `location_id`.        |
| `analytics.instagram_signals`           | Latest run: composite Instagram signals.                           |
| `analytics.promotion_menu_items`        | Latest run: per-menu promotion rows.                               |
| `analytics.category_mix`                | Latest run: category revenue/qty mix.                              |
| `analytics.revenue_trends`              | Latest run: per-menu revenue vs prior period.                      |
| `platform.menu_items`                   | Latest run: distinct menu lines (category, avg unit price).        |
| `analytics.weekly_demand_pattern`       | Latest run: ISO-week revenue/tx indices vs location mean.          |
| `platform.location_social_settings`     | Brand voice, pillars, hashtags (optional row per location).        |
| `milestone.prior_data`                  | Latest milestonedata Markdown for `data_task` under `workflow_id`. |

**Adding new prefetch data:** implement an async handler → register in `PREFETCH_HANDLERS` → add `fetch_*` in `graphql_client.py` using the same `graphql_post` pattern. Non-trivial analytics belong in **`packages/menuyukti`** with thin GraphQL resolvers — see [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md) and [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md).

## Milestone Prepare API

[`milestone_prepare.py`](../../../apps/agents/routers/milestone_prepare.py) resolves the skill with **`get_skill_path(body.data_task)`** (defaults when the client omits `data_task`). The Next.js BFF forwards `data_task` from the milestone Data source — see [`menuyukti-web`](../menuyukti-web/SKILL.md).

New runtime skills can be exercised with `run_skill_events(get_skill_path("your_skill_id"), ...)` in tests.

## Checklist (agents-only)

1. **`graphql_post`** — correct env and headers in [`graphql_base.py`](../../../apps/agents/agents/graphql_base.py).
2. **Prefetch** — `fetch_*` in `skill_runner/graphql_client.py`; handler in `handlers.py` with a dot-separated `use` string.
3. **Runtime skill file** — `packages/agent-skills/.../skills/<skill_id>/SKILL.md` with valid `menuyukti` YAML (folder name matches `data_task` / milestone `dataTask`).

## Related

| Topic             | Skill                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| GraphQL schema    | [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md)                   |
| Web UI + enums    | [`menuyukti-web`](../menuyukti-web/SKILL.md)                           |
| Analytics package | [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md)               |
| Monorepo map      | [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md) |

## Canonical docs

- [`AGENTS.md`](../../../AGENTS.md)
- [`apps/graphql/README.md`](../../../apps/graphql/README.md), [`packages/menuyukti/README.md`](../../../packages/menuyukti/README.md)

## Progressive disclosure

Split long handler or API notes into `reference.md` in this folder if this file grows.
