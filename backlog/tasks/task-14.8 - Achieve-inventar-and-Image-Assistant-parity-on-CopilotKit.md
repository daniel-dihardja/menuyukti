---
id: TASK-14.8
title: Achieve inventar and Image Assistant parity on CopilotKit
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:11:00Z'
updated_date: '2026-11-01T09:33:00Z'
labels:
  - frontend
  - chat
  - advisor
dependencies:
  - TASK-14.4
  - TASK-14.5
  - TASK-14.6
references:
  - apps/web/lib/chat/chat-modes.ts
  - apps/web/lib/chat/chatkit-entity-search.ts
parent_task_id: TASK-14
priority: medium
type: feature
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Advisor is not the only ChatKit consumer: inventar mode and Image Assistant (when flagged) share chat infrastructure. Cutover is incomplete if only general mode works on `/advisor` while inventar or image flows remain on ChatKit or regress.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Inventar chat mode works on CopilotKit path with refill-forecast tools available as today
- [x] #2 Image Assistant mode behavior matches current feature-flag reality (usable when enabled; hidden/disabled when chatImageAssistant is off)
- [x] #3 Entity mention/search (or documented replacement) remains available if still required by product; otherwise spike decision is followed and UX copy updated
- [x] #4 Thread history load/delete behaviors remain scoped to the authenticated user
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. InventarCopilotPanel with chatMode inventar. 2. Image assistant remains flag-gated. 3. Entity search removed with documented rail attachment. 4. History delete stays user-scoped.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Inventar uses CopilotKit AG-UI with inventar mode headers. Image Assistant still gated by chatImageAssistant. Entity @-search removed; rail visualizations documented in doc-7. History DELETE remains user-prefixed checkpointer only.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Inventar assistant runs on CopilotKit with chatMode=inventar and refill tools. Image Assistant mode remains behind chatImageAssistant. Entity mention search dropped with rail attach as replacement. Thread history load/delete stay user-scoped.

<!-- SECTION:FINAL_SUMMARY:END -->
