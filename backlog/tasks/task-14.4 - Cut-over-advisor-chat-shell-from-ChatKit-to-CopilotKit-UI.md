---
id: TASK-14.4
title: Cut over advisor chat shell from ChatKit to CopilotKit UI
status: To Do
assignee: []
created_date: '2026-11-01T09:10:00Z'
labels:
  - frontend
  - chat
  - advisor
dependencies:
  - TASK-14.3
references:
  - apps/web/components/chat/chatkit/advisor-chatkit.tsx
  - apps/web/app/(protected)/agent/
parent_task_id: TASK-14
priority: high
type: feature
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

`AdvisorChatKit` owns thread switching, composer, start prompts, and locale today. Operators should keep the single-page `/advisor` experience (custom chrome + right rail) while the conversation column is powered by CopilotKit hooks/components instead of `@openai/chatkit-react`.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Advisor conversation column uses CopilotKit (prebuilt or headless) instead of ChatKit React for flagged/new path
- [ ] #2 Creating, opening, and switching agent threads still uses agentThreadId routing semantics
- [ ] #3 Chat mode picker (general / image_assistant when enabled) continues to work
- [ ] #4 next-intl copy remains the source of user-facing strings for custom chrome around CopilotKit
- [ ] #5 Mobile compact layout still usable for send/receive
<!-- AC:END -->
