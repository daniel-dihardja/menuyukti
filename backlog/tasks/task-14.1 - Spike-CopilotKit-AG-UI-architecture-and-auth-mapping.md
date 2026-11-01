---
id: TASK-14.1
title: 'Spike: CopilotKit + AG-UI architecture and auth mapping'
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:10:00Z'
updated_date: '2026-11-01T09:17:00Z'
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
  - >-
    backlog/decisions/decision-1 -
    Self-host-AG-UI-LangGraph-on-agents-FastAPI-for-CopilotKit.md
documentation:
  - backlog/docs/agents/doc-7 - ChatKit-to-CopilotKit-migration-architecture.md
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

- [x] #1 Decision doc records chosen runtime path (self-hosted FastAPI AG-UI vs alternatives) and why
- [x] #2 Maps Clerk session → web BFF/runtime → agents headers (X-Menuyukti-User-Id, internal API key) without trusting client-supplied user ids
- [x] #3 Defines how agent_thread_id / CopilotKit threadId align with existing LangGraph checkpointer keys and history APIs
- [x] #4 Lists ChatKit features in production use (widgets, entity search, client effects, modes, stores) and the CopilotKit equivalent or explicit drop
- [x] #5 Flags migration risks for existing threads and dual-run options (feature flag vs hard cut)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Inventory ChatKit production features (widgets, entity search, client effects, modes, stores, thread ids).
2. Compare CopilotKit deployment shapes: LangSmith Platform vs self-hosted FastAPI AG-UI vs Copilot Cloud Runtime proxy.
3. Map Clerk → BFF → agents auth to a self-hosted AG-UI route that injects X-Menuyukti-User-Id without trusting the browser.
4. Define threadId = agentThreadId alignment with LangGraph checkpointer keys.
5. Record dual-run (feature flag) vs hard-cut risks.
6. Write backlog decision doc covering AC #1–#5; link it from TASK-14.1.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Recorded architecture in doc-7 and accepted decision-1: self-host AG-UI on agents FastAPI; Next.js Copilot Runtime stamps Clerk user id server-side; threadId=agentThreadId; checkpointer key unchanged; dual-run via chatCopilotKit flag.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Accepted decision-1 and documented architecture in doc-7: self-host AG-UI on agents FastAPI; Next.js Copilot Runtime stamps Clerk user id server-side; threadId=agentThreadId with unchanged checkpointer key; ChatKit→CopilotKit feature map; dual-run via chatCopilotKit flag. Ready for TASK-14.2 implementation.

<!-- SECTION:FINAL_SUMMARY:END -->
