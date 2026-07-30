# Menuyukti Agents (`apps/agents`)

FastAPI service for **LangChain / LangGraph streaming chat** via **[Vercel AI Gateway](https://vercel.com/docs/ai-gateway)** (OpenAI-compatible; default model `openai/gpt-4o-mini`). Chat-only product surface — no milestone-run API.

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
- Streaming chat: `POST /chat` — `text/event-stream` (SSE). Body: **`messages`** must contain **exactly one** `user` message (the new turn); history is loaded from the LangGraph checkpointer. **`agent_thread_id`** is required and selects the thread (`{user_id}:agent:{agent_thread_id}`); **`location_id`** is optional and passed into tools via run config. Modes: `general` | `story_image_assistant`. ReAct uses **`CHAT_RECURSION_LIMIT`** (20). Set **`LANGGRAPH_CHECKPOINT_DATABASE_URL`** for durable Postgres checkpoints via **`AsyncPostgresSaver`** (see `.env.example`). Optional **`TAVILY_API_KEY`** enables **`search_web`** in chat.
- Chat history: `GET /chat/history` — returns checkpoint messages as UIMessage-shaped JSON (`messages`, `story_assets`, `thread_id`). Requires **`agent_thread_id`**. Durable across restarts only when Postgres checkpoints are configured. `DELETE /chat/history` removes that agent thread’s checkpoints.
- **Helper:** `POST /format-markdown` — JSON body `{"content":"...","preset":"milestone-data"}` returns `{"formatted":"..."}`. Preset name is a leftover label for free-form notes cleanup (`agents/core/format_markdown/`); not a campaign pipeline.

## Quality

```bash
make lint
make format
make typecheck
make test
```

## Tracing

- **LangSmith:** set `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`, and optionally `LANGCHAIN_PROJECT` in `.env` (see `.env.example`).
- **Distributed traces:** the web BFF forwards the browser `traceparent` header to this service when present.

## Monorepo

This app is a **uv workspace member** (see root `pyproject.toml`). Use `uv sync` from the repo root or `make install` here.

## Optional web search

| Variable         | Default   | Purpose                                                       |
| ---------------- | --------- | ------------------------------------------------------------- |
| `TAVILY_API_KEY` | _(unset)_ | Optional. Enables Tavily **`search_web`** in chat ReAct only. |
