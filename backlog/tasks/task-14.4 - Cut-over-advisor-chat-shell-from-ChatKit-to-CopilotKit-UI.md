---
id: TASK-14.4
title: Cut over advisor chat shell from ChatKit to CopilotKit UI
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:10:00Z'
updated_date: '2026-11-01T09:26:00Z'
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

- [x] #1 Advisor conversation column uses CopilotKit (prebuilt or headless) instead of ChatKit React for flagged/new path
- [x] #2 Creating, opening, and switching agent threads still uses agentThreadId routing semantics
- [x] #3 Chat mode picker (general / image_assistant when enabled) continues to work
- [x] #4 next-intl copy remains the source of user-facing strings for custom chrome around CopilotKit
- [x] #5 Mobile compact layout still usable for send/receive
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add AdvisorCopilotChat using CopilotChat + shell toolbar parity.
2. Gate chat pane on isChatCopilotKitEnabled (Copilot vs ChatKit).
3. Bind threadId to agentThreadId; keep mode picker via shell.
4. Typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Added AdvisorChatPane gate + AdvisorCopilotChat (CopilotChat + toolbar + clear-thread rotate). Provider uses react-core/v2. Flag still default off so production stays on ChatKit until dual-run validation.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Advisor conversation column switches to CopilotKit when chatCopilotKit is enabled: threadId=agentThreadId, mode picker retained via toolbar, next-intl placeholders, mobile layout unchanged. ChatKit remains default (flag off).

<!-- SECTION:FINAL_SUMMARY:END -->
