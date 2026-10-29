# Menuyukti Agents (`apps/agents`)

FastAPI service for **LangChain / LangGraph streaming chat** via **[Vercel AI Gateway](https://vercel.com/docs/ai-gateway)** (OpenAI-compatible; default model `openai/gpt-5.4`). Chat-only product surface — no milestone-run API.

## Setup

Shared keys (`AI_GATEWAY_API_KEY`, `GRAPHQL_ENDPOINT`, internal API keys, checkpoint DB URL) belong in the **repo-root** `.env` (see `/.env.example`). This service loads root first, then optional `apps/agents/.env` overrides (`agents_app.env_bootstrap`).

From this directory (requires [uv](https://docs.astral.sh/uv/)):

```bash
make install
# Ensure AI_GATEWAY_API_KEY is set in the monorepo root `.env`
# Optional agents-only keys: cp .env.example .env  (TAVILY_API_KEY, GOOGLE_MAPS_API_KEY, …)
# Gateway docs: https://vercel.com/docs/ai-gateway#using-the-ai-gateway-with-an-api-key
```

## Run

```bash
make dev
```

- API: `http://127.0.0.1:8001`
- Health: `GET /health`
- Streaming chat: `POST /chat` — `text/event-stream` (SSE). Body: **`messages`** must contain **exactly one** `user` message (the new turn); history is loaded from the LangGraph checkpointer. **`agent_thread_id`** is required and selects the thread (`{user_id}:agent:{agent_thread_id}`); **`location_id`** is optional and passed into tools via run config. Modes: `general` | `image_assistant` (legacy alias `story_image_assistant`). Graph factory: **`compile_chat_graph`**. ReAct uses **`CHAT_RECURSION_LIMIT`** (20). Set **`LANGGRAPH_CHECKPOINT_DATABASE_URL`** for durable Postgres checkpoints via **`AsyncPostgresSaver`** over an **`AsyncConnectionPool`** (see `.env.example`). Optional **`TAVILY_API_KEY`** enables **`search_web`** in chat. Used by Inventar / IG Studio (AI SDK) and as the LangGraph runtime behind ChatKit.
- Advisor ChatKit: `POST /chatkit` — OpenAI ChatKit protocol (JSON or SSE). Self-hosted **`ChatKitServer`** maps turns onto **`compile_chat_graph`**. Context headers: **`X-Chatkit-Agent-Thread-Id`**, location / analytics / mode / model fields. Durable ChatKit **`Store`** uses the same Postgres URL as checkpoints when set (else in-memory). Proxied from the web BFF at **`/api/chatkit`**.
- Chat history: `GET /chat/history` — returns checkpoint messages as UIMessage-shaped JSON (`messages`, `story_assets`, `thread_id`). Requires **`agent_thread_id`**. Durable across restarts only when Postgres checkpoints are configured. `DELETE /chat/history` removes that agent thread’s LangGraph checkpoints **and** the matching ChatKit store thread (dual cleanup for advisor clear/rotate).
- **Helper:** `POST /format-markdown` — JSON body `{"content":"...","preset":"notes"}` returns `{"formatted":"..."}`. Legacy preset id `milestone-data` is an alias of `notes` (`agents/core/format_markdown/`); not a campaign pipeline.
- **Style draft:** `POST /style-specs/draft-from-image` — IG Studio vision helper.

## Auth and trust boundary (advisor chat)

**Active LLM path:** web advisor BFF (`POST /api/chat`, `POST /api/chatkit`) → this service (`POST /chat`, `POST /chatkit`) → GraphQL with the same user id.

### Operator checklist

1. **Do not expose agents on the public internet.** Bind to a private network / VPC / mesh that only the Next.js BFF (and other trusted server-side callers) can reach. `GET /health` is open for probes; every other route is privileged when a key is configured.
2. **Set a shared secret in production.** Require **`INTERNAL_API_KEY`** or **`GRAPHQL_INTERNAL_API_KEY`** (same value the web BFF sends as **`X-Internal-Api-Key`** via `apps/web/lib/agents/headers.ts`). Production / `AGENTS_REQUIRE_INTERNAL_API_KEY=1` fail-fast at startup without a key; production also requires **`LANGGRAPH_CHECKPOINT_DATABASE_URL`**.
3. **Rotate the key with GraphQL.** Prefer one shared internal key rotated together for BFF → agents and agents → GraphQL. Share it only with trusted server components — never with browsers or client bundles.
4. **Treat key + network reachability as full impersonation.** Anyone who can call agents with a valid key can set any **`X-Menuyukti-User-Id`** and act as that user on chat. Identity for advisor chat must come only from the Clerk-authenticated BFF, which stamps the session user into that header.

### Request headers

- Advisor chat endpoints require **`X-Menuyukti-User-Id`** (missing → 401).
- When an internal API key is set, inbound requests (except `GET /health`) must send matching **`X-Internal-Api-Key`** (wrong/missing → 403). The same shared-secret resolution is used for outbound GraphQL calls.

### Follow-up (not implemented)

Short-lived BFF→agents tokens that bind `sub` to the Clerk user id would reduce blast radius if the long-lived shared secret leaks. That migration is optional and separate from this checklist.

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

| Variable              | Default   | Purpose                                                                                                                                                    |
| --------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TAVILY_API_KEY`      | _(unset)_ | Optional. Enables Tavily **`search_web`** in chat ReAct and Nearby Locations enrichment.                                                                   |
| `GOOGLE_MAPS_API_KEY` | _(unset)_ | Required for Nearby Locations playbook scan (`POST /playbooks/nearby-locations/scan`). Places API (New). `GOOGLE_API_KEY` is accepted as a fallback alias. |
