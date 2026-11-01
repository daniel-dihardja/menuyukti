---
id: TASK-14
title: Replace ChatKit with CopilotKit for advisor agents
status: To Do
assignee: []
created_date: '2026-11-01T09:10:00Z'
labels:
  - chat
  - advisor
  - agents
  - frontend
dependencies: []
references:
  - apps/web/components/chat/chatkit/
  - apps/web/app/api/chatkit/route.ts
  - apps/agents/agents/core/chatkit/
  - apps/agents/routers/chatkit.py
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
  - https://docs.copilotkit.ai/integrations/langgraph/
  - https://docs.ag-ui.com/introduction
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
priority: high
type: feature
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

OpenAI ChatKit is the current `/advisor` shell, but deeper agent–app integration (shared workspace state, generative UI from tools, real HITL) requires a growing custom LangGraph→ChatKit bridge, ChatKit widget DSL, and client-effect protocol. CopilotKit (AG-UI + LangGraph FastAPI) is purpose-built for bidirectional agent state, React generative UI, frontend tools, and human-in-the-loop — which matches Menuyukti's chat-first advisor + right-rail workspace direction.

Goal: migrate `/advisor` (and inventar chat mode) from ChatKit to CopilotKit while keeping the existing LangGraph ReAct graph, checkpointer threads (`agentThreadId`), Clerk→BFF→agents trust boundary, chat modes (`general` | `image_assistant` | `inventar`), and workspace rail capabilities.

Out of scope unless a child explicitly includes it: redesigning GraphQL tools, rebuilding analytics pipelines, or re-enabling Leonardo Image Assistant beyond parity with today's flag state.

Related: TASK-8.4 (real HITL for image generate) can land more naturally after CopilotKit HITL primitives exist.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Children cover spike/architecture, agents AG-UI endpoint, web CopilotKit runtime+auth, chat UI cutover, shared workspace state, generative UI parity, HITL, mode/feature parity, and ChatKit removal+docs
- [ ] #2 Existing LangGraph chat graph and agent_thread_id persistence remain the source of truth for conversation state
- [ ] #3 Clerk-owned user identity and X-Menuyukti-User-Id / internal API key trust boundary are preserved (doc-1 still accurate after cutover)
- [ ] #4 ChatKit CDN, @openai/chatkit-react, agents chatkit bridge/store/router, and /api/chatkit are removed or fully unused in production paths when the epic is Done
- [ ] #5 No child expands into unrelated Square/POS or full GraphQL security audit work
<!-- AC:END -->
