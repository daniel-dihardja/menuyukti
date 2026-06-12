# Menuyukti Agents (`apps/agents`)

FastAPI service for **LangChain / LangGraph** workflows with streaming chat via **[Vercel AI Gateway](https://vercel.com/docs/ai-gateway)** (OpenAI-compatible; default model `openai/gpt-4o-mini`).

## Setup

From this directory (requires [uv](https://docs.astral.sh/uv/)):

```bash
make install
cp .env.example .env
# Set AI_GATEWAY_API_KEY in .env (see https://vercel.com/docs/ai-gateway#using-the-ai-gateway-with-an-api-key)
```

## Run

```bash
make dev
```

- API: `http://127.0.0.1:8001`
- Health: `GET /health`
- Streaming chat: `POST /chat` — `text/event-stream` (SSE). Body: **`messages`** must contain **exactly one** `user` message (the new turn); history is loaded from the LangGraph checkpointer. **`workflow_id`** (campaign) or **`agent_thread_id`** (standalone agent) selects the thread; **`milestone_id`** / **`location_id`** are optional and passed into tools via run config. ReAct uses **`CHAT_RECURSION_LIMIT`** (20). Set **`LANGGRAPH_CHECKPOINT_DATABASE_URL`** for durable Postgres checkpoints (see `.env.example`). Optional **`TAVILY_API_KEY`** enables **`search_web`** in chat.
- **Core:** `POST /format-markdown` — JSON body `{"content":"...","preset":"milestone-data"}` returns `{"formatted":"..."}`. Preset-driven Markdown cleanup for free-form notes (platform helper in `agents/core/format_markdown/`, not structured milestonedata).

## Milestone run

- **`POST /milestones/{id}/run`** — LangGraph flow: fetch milestone context → resolve milestone `presetId` → execute dedicated preset graph module → shared evaluation graph. **`milestone_data`** persists flat structured JSON on the milestonedata child via GraphQL upsert.
- **Core** (`agents/core/`): chat, milestone run/eval, format-markdown presets, milestone data persistence.

## Quality

```bash
make lint
make format
make typecheck
make test
```

## Tracing

- **LangSmith:** set `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`, and optionally `LANGCHAIN_PROJECT` in `.env` (see `.env.example`). Milestone runs pass `run_id`, `milestone_id`, and `workflow_id` as run metadata. On completion, `externalTraceId` is populated when LangSmith tracing is active.
- **Product DB:** each run registers `startMilestoneAgentRun` / `completeMilestoneAgentRun` on GraphQL (table `milestone_agent_run`) with a compact timeline (no prompts or tool bodies). Failed `startMilestoneAgentRun` aborts the SSE stream. Optional `LANGSMITH_RUN_URL_TEMPLATE` fills `external_trace_url` on completion (`{run_id}` placeholder).
- **Distributed traces:** the web BFF forwards the browser `traceparent` header to this service; it is stored in run metadata (LangSmith) and in the persisted row summary when provided.

## Monorepo

This app is a **uv workspace member** (see root `pyproject.toml`). Use `uv sync` from the repo root or `make install` here.

## Optional web search

| Variable         | Default   | Purpose                                                       |
| ---------------- | --------- | ------------------------------------------------------------- |
| `TAVILY_API_KEY` | _(unset)_ | Optional. Enables Tavily **`search_web`** in chat ReAct only. |
