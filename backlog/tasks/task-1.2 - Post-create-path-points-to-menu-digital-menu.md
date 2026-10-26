---
id: TASK-1.2
title: Post-create path points to menu / digital menu
status: To Do
assignee: []
created_date: '2026-10-26T08:09:00Z'
labels:
  - web
  - locations
  - digital-menu
  - onboarding
dependencies:
  - TASK-1.1
references:
  - apps/web/app/(protected)/analytics/locations/location-form.tsx
  - apps/web/lib/routes.ts
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

After create, toast success currently offers upload sales and navigates to location detail framed by Reports/COGS/Menu/POS. That steers trials into analytics/POS instead of publishing a guest menu.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Post-create primary CTA or redirect targets menu management and/or digital menu console for the new location
- [ ] #2 Post-create messaging does not promote upload sales, POS, COGS, or inventar as the next step
<!-- AC:END -->
