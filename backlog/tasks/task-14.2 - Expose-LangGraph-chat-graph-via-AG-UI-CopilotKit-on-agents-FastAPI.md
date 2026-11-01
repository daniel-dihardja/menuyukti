---
id: TASK-14.2
title: Expose LangGraph chat graph via AG-UI / CopilotKit on agents FastAPI
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:10:00Z'
updated_date: '2026-11-01T09:21:00Z'
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

- [x] #1 Agents FastAPI exposes an AG-UI/CopilotKit-compatible endpoint for the existing chat graph with checkpointer
- [x] #2 Chat modes (general, image_assistant, inventar) remain selectable via the same product semantics as today
- [x] #3 Authenticated requests still require X-Menuyukti-User-Id (and internal key when configured); unauthenticated calls are rejected
- [x] #4 Token/tool streaming works end-to-end against a minimal CopilotKit or AG-UI client smoke test
- [x] #5 Unit/integration tests cover auth rejection and a happy-path stream without depending on ChatKit types
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add ag-ui-langgraph + copilotkit deps to apps/agents via uv.
2. Add authenticated AG-UI FastAPI route that wraps compile_chat_graph / app.state.chat_graph with LangGraphAGUIAgent.
3. Inject X-Menuyukti-User-Id + context headers into per-request agent config / RunnableConfig (resolve_thread_id).
4. Support chat_mode and advisor context headers renamed to X-Menuyukti-\*.
5. Add tests for 401 without user header and smoke stream/auth happy path.
6. Keep ChatKit route intact for dual-run.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Added POST /copilotkit/advisor + health; MenuyuktiLangGraphAGUIAgent rewrites checkpointer thread_id; chat modes/context via X-Menuyukti-\* headers; httpx client bound in stream generator. Tests: tests/core/test_copilotkit_agui.py (6 passed). ChatKit route unchanged for dual-run.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Exposed existing chat graph over AG-UI at POST /copilotkit/advisor with Clerk-style X-Menuyukti-User-Id auth, mode/context headers, and checkpointer thread key mapping. Verified with 6 unit tests. Ready for web Copilot Runtime (TASK-14.3).

<!-- SECTION:FINAL_SUMMARY:END -->
