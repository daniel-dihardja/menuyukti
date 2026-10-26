---
id: TASK-1.4
title: Defer opening hours; presets-first when editing hours
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T08:09:00Z'
updated_date: '2026-10-26T09:26:00Z'
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

- [x] #1 Create succeeds without configuring opening hours
- [x] #2 When hours are edited, presets (e.g. weekdays / every day / copy Monday) are the primary path rather than only a buried secondary control
- [x] #3 Invalid open/close pairs are still rejected when a day is marked open
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add schedule summary card. 2. Replace long outline preset buttons with large short-title preset cards. 3. Enlarge day Open/Closed row targets; keep accordion on small screens. 4. Wire create optional hours block and edit Hours tab to shared UI; scroll/focus invalid day on error.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Presets-first cards + schedule summary; create omits openingHours when all-closed; day editor secondary with min-h-11 row targets; invalid hours still blocked and focuses the day. Unit tests for summary helpers passed.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Hours UX leads with summary + large preset cards; day editor is secondary. Create can skip hours (omitted when all closed). Invalid open/close pairs still rejected with focus/scroll to the day. Verified with vitest location-opening-hours-summary + typecheck.

<!-- SECTION:FINAL_SUMMARY:END -->
