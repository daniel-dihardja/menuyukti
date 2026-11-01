---
id: decision-1
title: Self-host AG-UI LangGraph on agents FastAPI for CopilotKit
date: '2026-11-01T09:16:00Z'
status: accepted
---

## Context

Menuyukti advisor chat runs on self-hosted FastAPI + LangGraph with Clerk identity injected by the Next.js BFF (`X-Menuyukti-User-Id`). OpenAI ChatKit requires a custom LangGraph→ChatKit bridge and blocks deeper agent–app integration (shared state, generative UI, HITL). CopilotKit offers multiple hosting shapes (LangSmith Platform, Copilot Cloud, self-hosted AG-UI).

## Decision

Self-host AG-UI (`ag-ui-langgraph` + `LangGraphAGUIAgent`) on `apps/agents` FastAPI using the existing chat graph and checkpointer. Next.js Copilot Runtime (`/api/copilotkit`) connects via `HttpAgent` and stamps Clerk user id + internal API key as **server-configured** agent headers. Product `agentThreadId` equals AG-UI `threadId`; LangGraph checkpointer key remains `{userId}:agent:{agentThreadId}`. Dual-run behind feature flag `chatCopilotKit` until ChatKit removal (TASK-14.9).

Full mapping, auth diagram, feature table, and risks: `backlog/docs/agents/doc-7 - ChatKit-to-CopilotKit-migration-architecture.md`.

## Consequences

- New Python deps: `ag-ui-langgraph`, `copilotkit` (agents); new web packages for CopilotKit runtime/react.
- ChatKit path remains until flag flip + TASK-14.9 cleanup.
- Rejects LangSmith-only and browser-direct agent connections for production.
- TASK-8.4 (image HITL) should reuse CopilotKit HITL after TASK-14.7.
