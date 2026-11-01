---
id: TASK-14.5
title: Wire shared CoAgent state for advisor workspace rail
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:11:00Z'
updated_date: '2026-11-01T09:33:00Z'
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

- [x] #1 Documented shared-state schema covers at least locationId, analyticsRunId, workspaceTab, and chatMode (or explicit rationale for omissions)
- [x] #2 UI can read agent state updates without ChatKit client effects
- [x] #3 User changes in the right rail are visible to the agent on subsequent turns without stuffing them into free-text messages
- [x] #4 Venue switch vs thread-binding behavior remains consistent with TASK-10 semantics
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Define AdvisorCoAgentState type (locationId, analyticsRunId, workspaceTab, chatMode).
2. useCoAgent in shell bridge; sync rail writes into setState.
3. Document schema in short comment / notes.
4. Typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Defined AdvisorCoAgentState; useCoAgent sync in AdvisorCoAgentStateSync; ChatAgentState camelCase fields; schema documented in doc-7 §7. Shell owns chatMode (TASK-10). tsc clean.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Bidirectional CoAgent state syncs locationId, analyticsRunId, workspaceTab, and chatMode between the advisor rail and the advisor AG-UI agent. Venue/thread binding stays in shell registry. Verified with web tsc.

<!-- SECTION:FINAL_SUMMARY:END -->
