---
id: doc-9
title: Advisor agent runtime and AG-UI sync
type: guide
created_date: '2026-11-16T07:54:00Z'
updated_date: '2026-11-16T07:55:00Z'
---

# Advisor agent runtime and AG-UI sync

How the advisor agent decides tools, fetches data, and stays in sync with the chat UI via CopilotKit + AG-UI.

## What the agent does

On each operator turn the agent:

1. Builds a **mode-specific system prompt** (general / image_assistant / inventar).
2. **Binds the tool list for that mode** (server-side — the model does not invent the catalog).
3. Runs a **ReAct loop** (`create_agent`): reason → optional tool calls → observe → answer.
4. Streams progress to the UI as **AG-UI events** (or SSE on the legacy `/chat` path).
5. Persists messages in the **LangGraph checkpointer** under a user-scoped thread id.

Tools call **GraphQL** (and a few external APIs) to read/write product data. The model never receives raw DB credentials and cannot spoof `user_id` / `location_id` — those are injected via `RunnableConfig.configurable`.

## End-to-end path (primary)

```text
Operator types in CopilotChat (agentId=advisor, threadId=agentThreadId)
  → POST /api/copilotkit  (+ allowlisted context headers; no user id)
  → BFF stamps X-Menuyukti-User-Id + X-Internal-Api-Key on HttpAgent
  → POST {agents}/copilotkit/advisor
  → MenuyuktiLangGraphAGUIAgent maps threadId → checkpointer thread_id
  → create_agent ReAct (prompt + tools for chat_mode)
  → tools → graphql_post → apps/graphql
  → AG-UI event stream → generative UI / HITL / CoAgent state
```

| Layer         | Key files                                                                    |
| ------------- | ---------------------------------------------------------------------------- |
| Chat UI       | `apps/web/components/chat/copilotkit/advisor-copilot-chat.tsx`               |
| Provider      | `advisor-copilotkit-provider.tsx` (`runtimeUrl=/api/copilotkit`)             |
| Web BFF       | `apps/web/app/api/copilotkit/route.ts`                                       |
| AG-UI route   | `apps/agents/routers/copilotkit.py`                                          |
| AG-UI adapter | `apps/agents/agents/core/copilotkit/agent.py`                                |
| Graph         | `apps/agents/agents/core/chat/graph.py` (`compile_chat_graph`)               |
| Tool gate     | `apps/agents/agents/core/chat/tools_registry.py`                             |
| Middleware    | `apps/agents/agents/core/chat/middleware.py` (`select_chat_model_and_tools`) |

### Thread identity

| Concept                  | Value                                                    |
| ------------------------ | -------------------------------------------------------- |
| URL / product id         | `agentThreadId` on `/advisor/[threadId]`                 |
| CopilotKit `threadId`    | **Same string** as `agentThreadId`                       |
| Checkpointer `thread_id` | `{userId}:agent:{agentThreadId}` via `resolve_thread_id` |

History list/delete (sidebar) still uses `GET/DELETE /api/chat/history` → agents `/chat/history`. Checkpoints remain authoritative for message content.

## Deciding which tools to use

### Mode gate (catalog)

Each request carries `chat_mode` (header `X-Menuyukti-Chat-Mode` / CoAgent state). Middleware calls `chat_tools_list_from_config`:

| Mode              | Typical tools (data / actions)                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `general`         | Media, `search_knowledge`, optional location + advisor memory, charts/COGS when `analytics_run_id` is set, optional `search_web` (Tavily). Image generate is **not** bound in general. |
| `image_assistant` | Media, story scratchpad, `request_story_generate_confirmation`, `generate_instagram_post_image` (feature-flagged in UI).                                                               |
| `inventar`        | `get_inventory_refill_forecast` (+ location when present). Used from inventar surfaces, not the advisor mode picker.                                                                   |

Prompts under `apps/agents/agents/core/chat/prompts/` are written to match the bound tools (see [doc-4](./doc-4%20-%20Chat-advisor-prompt-construction.md)).

### Model selection inside the loop

Given the **already-bound** tool set, the LLM chooses when to call tools vs answer. That is ordinary ReAct tool-calling — not a separate planner graph.

Tenant context (`user_id`, `location_id`, `analytics_run_id`) is injected into tools (`InjectedToolArg` / config). The model cannot pick another user’s data by forging ids.

### Knowledge vs memory

- **`search_knowledge`** — curated RAG over `apps/graphql/knowledge/` (domain / KPI / playbook). See [doc-5](./doc-5%20-%20Chat-advisor-knowledge-RAG.md).
- **Location advisor memory** — separate GraphQL fields/tools for venue-scoped notes (not the knowledge corpus).

## Chat UI ↔ agent sync (AG-UI)

### Transport

CopilotKit talks AG-UI to the self-hosted agent (`ag-ui-langgraph` / `LangGraphAGUIAgent`). The web never opens agents with a browser-owned user header; the BFF `HttpAgent` does.

Secondary/legacy: `POST /api/chat` SSE still hits the **same** `compile_chat_graph` for IG Studio and some helpers. HITL interrupt UX is AG-UI-specific (`configurable.transport == "agui"`).

### CoAgent shared state (rail ↔ agent)

Bidirectional fields (camelCase on both sides):

- `locationId`, `analyticsRunId`, `workspaceTab`, `chatMode`

| Side        | Files                                                                               |
| ----------- | ----------------------------------------------------------------------------------- |
| Web sync    | `apps/web/components/chat/copilotkit/advisor-coagent-state-sync.tsx` (`useCoAgent`) |
| Schema      | `apps/web/lib/chat/advisor-coagent-state.ts` (agent name `advisor`)                 |
| Graph state | `apps/agents/agents/core/chat/state.py` (`ChatAgentState`)                          |
| Shell       | `AdvisorChatKitShellProvider` + workspace rail                                      |

`chatMode` remains shell-owned for product UX: the agent reads it; the UI does not flip mode from agent writes.

Allowlisted **context headers** (not identity) also forward thread/location/mode into agents on each run so tools see the current venue even before state merges.

### Generative UI (tool results in chat)

`advisor-copilot-generative-ui.tsx` uses CopilotKit `useRenderTool` so tool progress and results (charts, COGS, image generate, …) render inline. Completing some tools also attaches visualizations to the right rail and can switch `workspaceTab`.

### Human-in-the-loop

Story image confirmation pauses the AG-UI run with LangGraph `interrupt()` from `request_story_generate_confirmation` when transport is `agui`. UI: `advisor-copilot-hitl.tsx` (`useInterrupt` / `useHumanInTheLoop`). Resume carries the operator choice; `generate_confirmation_gate.py` enforces confirm-before-generate rules.

## Inventar parity

Inventar chat mounts the same `agentId="advisor"` CopilotKit path with `chatMode="inventar"` (`InventarCopilotPanel`), so tool gating and AG-UI sync match advisor, with inventar-only tools.

## Security notes (chat path)

- Spend limits and Pro plan checks run on the web BFF before the agent runs.
- Internal API key required on agents ↔ GraphQL when configured.
- Details: [doc-1](../security/doc-1%20-%20Chat-advisor-security-overview.md).

## Related

- Platform map: [doc-8](../architecture/doc-8%20-%20Menuyukti-platform-architecture.md)
- Historical ChatKit → CopilotKit cutover: [doc-7](./doc-7%20-%20ChatKit-to-CopilotKit-migration-architecture.md)
- Skills: `menuyukti-agents`, `menuyukti-web`
