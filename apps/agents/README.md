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

- **Core** (`agents/core/`): cross-cutting flows (chat, milestone evaluation, **format-markdown** presets).
- **Domain** (`agents/domain/<name>/`): data-source-specific graphs (e.g. location profile). The format endpoint is **not** domain-specific; milestone UI is one client.

## Quality

```bash
make lint
make format
make typecheck
make test
```

## Monorepo

This app is a **uv workspace member** (see root `pyproject.toml`). Use `uv sync` from the repo root or `make install` here.
