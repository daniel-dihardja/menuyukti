---
id: TASK-9.3
title: Map Square locations to MenuYukti locations
status: To Do
assignee: []
created_date: '2026-10-28T13:28:00Z'
labels:
  - square
  - graphql
  - web
dependencies:
  - TASK-9.2
parent_task_id: TASK-9
priority: high
type: feature
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Square sellers often have multiple locations. Analytics must attach to the correct MenuYukti location(s) after OAuth.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 After connect, seller can select which Square location(s) map to which MenuYukti location(s)
- [ ] #2 Unmapped Square locations are not silently mixed into another venue's analytics
- [ ] #3 Mapping can be updated later without redoing full OAuth when scopes already allow location list
<!-- AC:END -->
