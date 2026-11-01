---
id: TASK-14.7
title: Implement CopilotKit human-in-the-loop for advisor confirmations
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:11:00Z'
updated_date: '2026-11-01T09:33:00Z'
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

- [x] #1 At least one production advisor confirmation flow (story generate or equivalent) pauses the agent until the user responds in UI
- [x] #2 Cancel/reject path leaves agent/thread in a safe, resumable state
- [x] #3 No ChatKit client-effect protocol is required for the CopilotKit confirmation path
- [x] #4 Notes link how TASK-8.4 can reuse the same HITL primitive when chatImageAssistant returns
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. AG-UI transport flag. 2. interrupt() in request_story_generate_confirmation. 3. useInterrupt + useHumanInTheLoop UI. 4. Gate accepts confirmed tool result. 5. Notes for TASK-8.4.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

AG-UI sets configurable.transport=agui; tool interrupts; AdvisorCopilotHitl uses useInterrupt (Generate/Change/Cancel) and useHumanInTheLoop for frontend-tool reuse (TASK-8.4). generate_confirmation_gate accepts confirmed:true. Agents pytest + web tsc clean.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Story generate confirmation pauses the AG-UI run via LangGraph interrupt until the operator resolves Generate/Change/Cancel in CopilotKit UI. Cancel/change resumes safely with change_requested. No ChatKit client-effect protocol. TASK-8.4 can reuse useHumanInTheLoop/useInterrupt.

<!-- SECTION:FINAL_SUMMARY:END -->
