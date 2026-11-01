---
id: TASK-14.9
title: Remove ChatKit stack and update advisor security docs
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:11:00Z'
updated_date: '2026-11-01T09:33:00Z'
labels:
  - chat
  - agents
  - frontend
  - security
dependencies:
  - TASK-14.8
  - TASK-14.7
references:
  - apps/web/app/layout.tsx
  - apps/agents/agents/core/chatkit/
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-14
priority: high
type: chore
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

After the CopilotKit path is default, ChatKit packages, CDN script, agents chatkit modules, dual BFF routes, and security docs that describe ChatKit as the live path become dead weight and drift risk. Clean removal closes the epic.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Production advisor/inventar chat no longer loads ChatKit CDN or @openai/chatkit-react
- [x] #2 Unused agents chatkit bridge/store/router/widgets and web /api/chatkit are removed (or clearly deprecated with zero callers)
- [x] #3 doc-1 (and any chat architecture notes) describe CopilotKit/AG-UI path and trust boundary accurately
- [x] #4 CI/tests no longer require ChatKit-only suites for the primary path; remaining references are intentional or gone
- [x] #5 Feature flag dual-run (if any) is removed or defaulted to CopilotKit-only
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Always Copilot chat pane/inventar. 2. Remove CDN, chatkit-react, /api/chatkit, agents chatkit. 3. Update doc-1/doc-7/README. 4. Drop dual-run flag.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Removed ChatKit CDN, @openai/chatkit-react, openai-chatkit, agents chatkit modules/router/tests, /api/chatkit. chatCopilotKit flag removed. doc-1 + doc-7 + agents README updated. tsc + pytest (32) green.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

ChatKit stack removed from production path. Advisor/inventar chat is CopilotKit-only via /api/copilotkit → /copilotkit/advisor. Security and architecture docs describe the AG-UI trust boundary. Dual-run flag deleted.

<!-- SECTION:FINAL_SUMMARY:END -->
