---
id: TASK-14.7
title: Implement CopilotKit human-in-the-loop for advisor confirmations
status: To Do
assignee: []
created_date: '2026-11-01T09:11:00Z'
labels:
  - frontend
  - agents
  - chat
dependencies:
  - TASK-14.4
  - TASK-14.6
references:
  - apps/web/components/chat/chat-story-confirm-assets.tsx
  - https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop
  - >-
    backlog/tasks/task-8.4 -
    Upgrade-image-generate-to-real-human-in-the-loop-approval.md
parent_task_id: TASK-14
priority: medium
type: feature
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Story generate confirmation and similar approvals are custom request_confirmation / client-effect flows today. CopilotKit HITL (`useHumanInTheLoop` / frontend tools + LangGraph interrupt) should pause the agent until the operator acts in UI. This also unlocks TASK-8.4 when Image Assistant is re-enabled.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 At least one production advisor confirmation flow (story generate or equivalent) pauses the agent until the user responds in UI
- [ ] #2 Cancel/reject path leaves agent/thread in a safe, resumable state
- [ ] #3 No ChatKit client-effect protocol is required for the CopilotKit confirmation path
- [ ] #4 Notes link how TASK-8.4 can reuse the same HITL primitive when chatImageAssistant returns
<!-- AC:END -->
