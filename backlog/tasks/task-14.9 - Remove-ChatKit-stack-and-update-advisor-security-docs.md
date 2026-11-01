---
id: TASK-14.9
title: Remove ChatKit stack and update advisor security docs
status: To Do
assignee: []
created_date: '2026-11-01T09:11:00Z'
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

- [ ] #1 Production advisor/inventar chat no longer loads ChatKit CDN or @openai/chatkit-react
- [ ] #2 Unused agents chatkit bridge/store/router/widgets and web /api/chatkit are removed (or clearly deprecated with zero callers)
- [ ] #3 doc-1 (and any chat architecture notes) describe CopilotKit/AG-UI path and trust boundary accurately
- [ ] #4 CI/tests no longer require ChatKit-only suites for the primary path; remaining references are intentional or gone
- [ ] #5 Feature flag dual-run (if any) is removed or defaulted to CopilotKit-only
<!-- AC:END -->
