---
id: TASK-14.2
title: Expose LangGraph chat graph via AG-UI / CopilotKit on agents FastAPI
status: To Do
assignee: []
created_date: '2026-11-01T09:10:00Z'
labels:
  - agents
  - chat
dependencies:
  - TASK-14.1
references:
  - apps/agents/agents/core/chat/graph.py
  - apps/agents/routers/chat.py
  - https://docs.copilotkit.ai/integrations/langgraph/
parent_task_id: TASK-14
priority: high
type: feature
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The agents app already compiles the product ReAct graph (`compile_chat_graph`) and streams via ChatKit-specific adapters. Future generative UI and shared state need a standard AG-UI event stream instead of `stream_langgraph_as_chatkit`. This task adds the CopilotKit/AG-UI serving path beside (or replacing) ChatKit without rewriting tool business logic.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Agents FastAPI exposes an AG-UI/CopilotKit-compatible endpoint for the existing chat graph with checkpointer
- [ ] #2 Chat modes (general, image_assistant, inventar) remain selectable via the same product semantics as today
- [ ] #3 Authenticated requests still require X-Menuyukti-User-Id (and internal key when configured); unauthenticated calls are rejected
- [ ] #4 Token/tool streaming works end-to-end against a minimal CopilotKit or AG-UI client smoke test
- [ ] #5 Unit/integration tests cover auth rejection and a happy-path stream without depending on ChatKit types
<!-- AC:END -->
