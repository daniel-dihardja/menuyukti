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
- Streaming chat: `POST /chat` — `text/event-stream` (SSE), JSON body `{"messages":[{"role":"user","content":"..."}]}`
- **Core:** `POST /format-markdown` — JSON body `{"content":"...","preset":"milestone-goal"|"milestone-data"|...}` returns `{"formatted":"..."}`. Preset-driven Markdown cleanup (platform helper in `agents/core/format_markdown/`, not a domain graph).

## Core vs domain

- **Core** (`agents/core/`): cross-cutting flows (chat, milestone evaluation, **format-markdown** presets, **`milestone_data`** GraphQL upsert for persisting generated milestone text).
- **Domain** (`agents/domain/skill_runner/`): skill-driven prepare flows. **`POST /milestones/{id}/prepare`** resolves `SKILL.md` via **`agents/core/milestone_run/skills/<data_task>/`** first, then the legacy **`agent-skills`** package (e.g. `promotion_candidates`, `restaurant_brand_brief`, `instagram_campaign_schedule` via `data_task` in the JSON body; default `restaurant_brand_brief`). Prefetch + LLM instructions live in those files; saving to `milestonedata` is handled by core `milestone_data`, not declared in the skill file. The format endpoint is **not** domain-specific; milestone UI is one client.

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

## Custom API adapter tools (egress)

Workspace **API adapter tools** (API Proxies in the web app) are loaded during **milestone Run**: each active tool becomes a parameterless LangChain tool named with its stored **`tool_key`** (snake_case from the display name). The runtime calls **`adapter_http_get`** in `agents_app.agents.http.safe_egress`, which:

- Uses **`safe_https_get`** for `https://` URLs (SSRF-oriented checks, redirect re-validation, body size cap).
- For **local development only**, allows **`http://`** to a small host allowlist when `MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST=1`: `localhost`, `127.0.0.1`, `::1`, and `host.docker.internal` (plus any from `MENUYUKTI_ADAPTER_DEV_HTTP_EXTRA_HOSTS`). Ports are allowlisted by `MENUYUKTI_ADAPTER_DEV_HTTP_PORTS` (default `3090`). Dev HTTP uses a **dedicated** `httpx` client with **`trust_env=False`** so `HTTP_PROXY` / `HTTPS_PROXY` cannot break loopback calls. No redirects on this path.

Do not call user-configured URLs with a raw `httpx` client outside these helpers.

Environment variables (optional overrides):

| Variable                                 | Default   | Purpose                                                   |
| ---------------------------------------- | --------- | --------------------------------------------------------- |
| `MENUYUKTI_ADAPTER_HTTP_TIMEOUT_S`       | `15`      | Total request timeout (seconds), clamped to 1–120         |
| `MENUYUKTI_ADAPTER_HTTP_MAX_BYTES`       | `524288`  | Max response body bytes (512 KiB), clamped to 1 KiB–8 MiB |
| `MENUYUKTI_ADAPTER_HTTP_MAX_REDIRECTS`   | `5`       | Max redirect hops (HTTPS path only), clamped to 0–20      |
| `MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST`   | _(off)_   | Set to `1` / `true` / `yes` to allow dev HTTP to loopback |
| `MENUYUKTI_ADAPTER_DEV_HTTP_PORTS`       | `3090`    | Comma-separated allowlist for dev HTTP ports              |
| `MENUYUKTI_ADAPTER_DEV_HTTP_EXTRA_HOSTS` | _(empty)_ | Extra allowed hostnames for dev HTTP (comma-separated)    |

There is a residual DNS time-of-check vs time-of-use window versus the actual TCP connect; mitigating that fully requires stronger infrastructure (custom transport / pinning).
