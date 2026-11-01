---
id: TASK-14.1
title: 'Spike: CopilotKit + AG-UI architecture and auth mapping'
status: To Do
assignee: []
created_date: '2026-11-01T09:10:00Z'
labels:
  - chat
  - advisor
  - agents
dependencies: []
references:
  - apps/agents/server.py
  - apps/agents/routers/chatkit.py
  - apps/web/app/api/chatkit/route.ts
  - https://docs.copilotkit.ai/integrations/langgraph/agent-app-context
parent_task_id: TASK-14
priority: high
type: spike
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Need a concrete cutover design before coding so we do not paint ourselves into a Copilot Cloud-only or LangGraph Platform-only corner. Today advisors run as self-hosted FastAPI + LangGraph checkpointer with Clerk user id injected via BFF headers; CopilotKit has multiple deployment shapes (Copilot Runtime, ag-ui-langgraph FastAPI, LangSmith). The spike must pick the shape that preserves Menuyukti trust boundaries and thread identity (`agentThreadId`).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Decision doc records chosen runtime path (self-hosted FastAPI AG-UI vs alternatives) and why
- [ ] #2 Maps Clerk session → web BFF/runtime → agents headers (X-Menuyukti-User-Id, internal API key) without trusting client-supplied user ids
- [ ] #3 Defines how agent_thread_id / CopilotKit threadId align with existing LangGraph checkpointer keys and history APIs
- [ ] #4 Lists ChatKit features in production use (widgets, entity search, client effects, modes, stores) and the CopilotKit equivalent or explicit drop
- [ ] #5 Flags migration risks for existing threads and dual-run options (feature flag vs hard cut)
<!-- AC:END -->
