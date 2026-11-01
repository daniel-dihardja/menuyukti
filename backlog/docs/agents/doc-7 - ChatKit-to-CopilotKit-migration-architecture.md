---
id: doc-7
title: ChatKit to CopilotKit migration architecture
type: specification
created_date: '2026-11-01T09:16:00Z'
updated_date: '2026-11-01T09:32:00Z'
---

# ChatKit → CopilotKit migration architecture

**Decision:** decision-1 (accepted) — Self-host AG-UI LangGraph on agents FastAPI for CopilotKit  
**Epic:** TASK-14

## 1. Chosen runtime path

**Self-host AG-UI on `apps/agents` FastAPI** using `ag-ui-langgraph` + `LangGraphAGUIAgent`, with the existing `compile_chat_graph` + Postgres checkpointer.

Web connects via **Next.js Copilot Runtime** (`/api/copilotkit`) → `HttpAgent` pointing at agents (e.g. `POST /copilotkit/advisor`), with Clerk-derived identity set as **server-configured headers** on the HttpAgent (not browser-supplied user ids).

### Alternatives rejected

| Option                                              | Why not                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| LangSmith / LangGraph Platform hosting              | Would move persistence and auth off our FastAPI trust boundary; checkpointer and `X-Menuyukti-User-Id` model already live in `apps/agents`. |
| Browser → agents direct (`agents__unsafe_dev_only`) | Unsupported for production; skips BFF spend limits and identity injection.                                                                  |
| Copilot Cloud as the only agent host                | Same trust/control issues; we keep LLM via Vercel AI Gateway inside agents.                                                                 |

## 2. Auth map (Clerk → BFF → agents)

```
Browser (Clerk session cookie)
  → Next.js /api/copilotkit (requireProPlanApi / auth())
       - Resolve userId from Clerk only
       - Enforce chat spend limits (same as /api/chatkit)
       - Build HttpAgent headers via buildAgentsHeaders(userId):
           X-Menuyukti-User-Id: <Clerk userId>
           X-Internal-Api-Key: <GRAPHQL_INTERNAL_API_KEY> (when set)
       - Forward advisor context only (NOT identity) via allowlisted headers:
           X-Menuyukti-Agent-Thread-Id, X-Menuyukti-Location-Id,
           X-Menuyukti-Analytics-Run-Id, X-Menuyukti-Chat-Mode,
           X-Menuyukti-Chat-Model, generation/image prefs
  → apps/agents AG-UI route
       - Reject missing X-Menuyukti-User-Id (401)
       - Existing internal API key middleware unchanged
       - Bake user + context into LangGraph RunnableConfig.configurable
```

**Hard rule:** Never trust a browser-supplied `X-Menuyukti-User-Id`. Copilot Runtime must set that header on the server-side `HttpAgent` config so it wins over any forwarded inbound header.

## 3. Thread identity

| Concept                            | Value                                                                |
| ---------------------------------- | -------------------------------------------------------------------- |
| Product URL / registry id          | `agentThreadId` (UUID in `/advisor/[threadId]`)                      |
| CopilotKit / AG-UI `threadId`      | **Same string as `agentThreadId`**                                   |
| LangGraph checkpointer `thread_id` | `{userId}:agent:{agentThreadId}` via `resolve_thread_id` (unchanged) |

History list/delete stay on existing `/api/chat/history` → agents `/chat/history` (user-scoped). ChatKit item store is not the source of truth for messages once AG-UI+checkpointer is live; LangGraph checkpoints remain authoritative.

## 4. ChatKit features → CopilotKit mapping

| ChatKit today                                    | CopilotKit / AG-UI equivalent                             | Notes                                 |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------- |
| `@openai/chatkit-react` + CDN                    | `@copilotkit/react-core` + chat UI (prebuilt or headless) | Keep Menuyukti chrome (toolbar, rail) |
| `/api/chatkit` → `/chatkit`                      | `/api/copilotkit` → agents `/copilotkit/advisor`          | Feature-flag dual-run                 |
| ChatKit Postgres/Memory store                    | LangGraph checkpointer only                               | Drop ChatKit store at 14.9            |
| `stream_langgraph_as_chatkit` bridge             | AG-UI event stream from `LangGraphAGUIAgent`              | Delete bridge at 14.9                 |
| Card widgets (status, COGS, story, image)        | Generative UI / tool render / state render                | Reuse React viz + forms               |
| Client effects / `request_confirmation`          | `useHumanInTheLoop` + LangGraph interrupt                 | TASK-14.7; unlocks TASK-8.4           |
| Shell context headers (location, mode, …)        | Shared CoAgent state + allowlisted context headers        | TASK-14.5                             |
| Entity search (`entities`)                       | Keep client-side mention helper or suggestion API         | Product parity TASK-14.8              |
| Modes `general` / `image_assistant` / `inventar` | Same `chat_mode` in configurable / shared state           | Mode gating unchanged                 |
| Start-screen prompts                             | CopilotKit labels / empty-state suggestions               | Recreate via next-intl                |

## 5. Migration risks and dual-run

**Risks**

- Existing ChatKit thread item rows will not auto-appear in CopilotKit UI; checkpoints still have messages — hydrate from checkpointer or accept history from LangGraph only.
- Widget UX may regress until generative UI parity (14.6).
- Package churn (`ag-ui-langgraph`, `copilotkit`) vs current `openai-chatkit`.
- Auth misconfig if HttpAgent accidentally forwards client `X-Menuyukti-User-Id`.

**Dual-run plan**

1. Add feature flag `chatCopilotKit` (default **off** until 14.4–14.8 green).
2. When on: advisor/inventar mount CopilotKit path.
3. When off: ChatKit path unchanged.
4. TASK-14.9: default on / remove flag; delete ChatKit code/CDN/deps; update doc-1.

## 6. Implementation sequence

1. TASK-14.2 — AG-UI endpoint on agents
2. TASK-14.3 — Web runtime BFF + provider + flag
3. TASK-14.4 — Chat shell cutover
4. TASK-14.5 / 14.6 — shared state + generative UI
5. TASK-14.7 — HITL
6. TASK-14.8 — inventar / Image Assistant parity
7. TASK-14.9 — remove ChatKit + docs

## References

- https://docs.copilotkit.ai/integrations/langgraph/
- https://docs.copilotkit.ai/auth
- https://docs.ag-ui.com/introduction
- `apps/agents/agents/core/chat/chat_run_config.py`
- `backlog/docs/security/doc-1 - Chat-advisor-security-overview.md`

## 7. Shared CoAgent state (TASK-14.5)

Schema (`AdvisorCoAgentState` / LangGraph `ChatAgentState` camelCase fields):

| Field            | Meaning                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `locationId`     | Selected venue id (shell always has a concrete branch)                        |
| `analyticsRunId` | Pinned sales report, or `null`                                                |
| `workspaceTab`   | Right-rail tab: `insights` \| `story` \| `venue` \| `cogs`                    |
| `chatMode`       | `general` \| `image_assistant` \| `inventar` (shell owns picker; agent reads) |

Synced via `useCoAgent({ name: "advisor" })` ↔ shell. Venue switch vs thread-binding remains TASK-10 shell/registry semantics.

## 8. Generative UI + HITL (TASK-14.6 / 14.7)

- Tool renderers: `useRenderTool` for charts, COGS, image generate, and wildcard progress.
- Story confirm: LangGraph `interrupt` when `configurable.transport == "agui"`; web `useInterrupt` + `useHumanInTheLoop` (reuse for TASK-8.4).
- Entity @-mentions: ChatKit entity search removed; workspace rail visualization attach remains the attachment surface.

## 9. Post cutover (TASK-14.9)

ChatKit CDN, `@openai/chatkit-react`, agents `chatkit` package, and `/api/chatkit` removed. Primary path is CopilotKit → `/api/copilotkit` → `/copilotkit/advisor`.
