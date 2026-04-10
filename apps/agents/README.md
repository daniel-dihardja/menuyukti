# Menuyukti Agents (`apps/agents`)

FastAPI service for **LangChain / LangGraph** workflows with streaming chat over **OpenAI**.

## Setup

From this directory (requires [uv](https://docs.astral.sh/uv/)):

```bash
make install
cp .env.example .env
# Set OPENAI_API_KEY in .env
```

## Run

```bash
make dev
```

- API: `http://127.0.0.1:8001`
- Health: `GET /health`
- Streaming chat: `POST /chat` — `text/event-stream` (SSE), JSON body `{"messages":[{"role":"user","content":"..."}]}`
- **Core:** `POST /format-markdown` — JSON body `{"content":"...","preset":"milestone-goal"|"milestone-data"|...}` returns `{"formatted":"..."}`. Preset-driven Markdown cleanup (platform helper in `agents/core/format_markdown/`, not a domain graph).

## Core vs domain

- **Core** (`agents/core/`): cross-cutting flows (chat, milestone evaluation, **format-markdown** presets, **`milestone_data`** GraphQL upsert for persisting generated milestone text).
- **Domain** (`agents/domain/skill_runner/`): skill-driven prepare flows. **`POST /milestones/{id}/prepare`** loads runtime `SKILL.md` from the **`agent-skills`** package (e.g. `restaurant_brand_brief`, `instagram_campaign_schedule` via `data_task` in the JSON body; default `restaurant_brand_brief`). Prefetch + LLM instructions live in that package; saving to `milestonedata` is handled by core `milestone_data`, not declared in the skill file. The format endpoint is **not** domain-specific; milestone UI is one client.

## Quality

```bash
make lint
make format
make typecheck
make test
```

## Tracing

- **LangSmith:** set `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`, and optionally `LANGCHAIN_PROJECT` in `.env` (see `.env.example`). Milestone runs pass `run_id`, `milestone_id`, and `workflow_id` as run metadata on the outer graph and on the inner ReAct agent.
- **Product DB:** each run registers `startMilestoneAgentRun` / `completeMilestoneAgentRun` on GraphQL (table `milestone_agent_run`) with a compact timeline (no prompts or tool bodies). Optional `LANGSMITH_RUN_URL_TEMPLATE` fills `external_trace_url` on completion (`{run_id}` placeholder).
- **Distributed traces:** the web BFF forwards the browser `traceparent` header to this service; it is stored in run metadata (LangSmith) and in the persisted row summary when provided.

## Monorepo

This app is a **uv workspace member** (see root `pyproject.toml`). Use `uv sync` from the repo root or `make install` here.
