---
id: TASK-14.5
title: Wire shared CoAgent state for advisor workspace rail
status: To Do
assignee: []
created_date: '2026-11-01T09:11:00Z'
labels:
  - frontend
  - agents
  - advisor
dependencies:
  - TASK-14.4
references:
  - apps/web/components/chat/advisor-workspace-rail.tsx
  - apps/web/components/chat/chatkit/advisor-chatkit-shell-context.tsx
  - https://docs.copilotkit.ai/reference/v1/hooks/useCoAgent
parent_task_id: TASK-14
priority: high
type: feature
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Venue, sales-report scope, workspace tabs, and preview panels are coordinated today via ChatKit shell context and side effects. That coupling is fragile for agent-driven UX (auto-open Insights, prefill COGS, sync selected venue into tools). CopilotKit shared state (`useCoAgent` / `useAgent`) should become the bidirectional source for workspace-relevant fields.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Documented shared-state schema covers at least locationId, analyticsRunId, workspaceTab, and chatMode (or explicit rationale for omissions)
- [ ] #2 UI can read agent state updates without ChatKit client effects
- [ ] #3 User changes in the right rail are visible to the agent on subsequent turns without stuffing them into free-text messages
- [ ] #4 Venue switch vs thread-binding behavior remains consistent with TASK-10 semantics
<!-- AC:END -->
