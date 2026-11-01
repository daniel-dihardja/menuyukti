---
id: TASK-14.8
title: Achieve inventar and Image Assistant parity on CopilotKit
status: To Do
assignee: []
created_date: '2026-11-01T09:11:00Z'
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

- [ ] #1 Inventar chat mode works on CopilotKit path with refill-forecast tools available as today
- [ ] #2 Image Assistant mode behavior matches current feature-flag reality (usable when enabled; hidden/disabled when chatImageAssistant is off)
- [ ] #3 Entity mention/search (or documented replacement) remains available if still required by product; otherwise spike decision is followed and UX copy updated
- [ ] #4 Thread history load/delete behaviors remain scoped to the authenticated user
<!-- AC:END -->
