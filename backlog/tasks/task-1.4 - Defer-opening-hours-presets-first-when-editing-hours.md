---
id: TASK-1.4
title: Defer opening hours; presets-first when editing hours
status: To Do
assignee: []
created_date: '2026-10-26T08:09:00Z'
labels:
  - web
  - locations
dependencies:
  - TASK-1.1
references:
  - apps/web/app/(protected)/analytics/locations/location-form-hours-section.tsx
  - apps/web/app/api/locations/route.ts
parent_task_id: TASK-1
priority: medium
type: enhancement
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Create currently shows a full 7-day hours editor (defaults all closed) and may follow create with a second updateLocation call for hours. Hours matter for a public hub but should not block create; when editing, presets should lead so operators are not forced through seven empty closed rows.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Create succeeds without configuring opening hours
- [ ] #2 When hours are edited, presets (e.g. weekdays / every day / copy Monday) are the primary path rather than only a buried secondary control
- [ ] #3 Invalid open/close pairs are still rejected when a day is marked open
<!-- AC:END -->
