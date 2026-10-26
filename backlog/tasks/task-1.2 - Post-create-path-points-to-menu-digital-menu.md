---
id: TASK-1.2
title: Post-create path points to menu / digital menu
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T08:09:00Z'
updated_date: '2026-10-26T09:26:00Z'
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

- [x] #1 Post-create primary CTA or redirect targets menu management and/or digital menu console for the new location
- [x] #2 Post-create messaging does not promote upload sales, POS, COGS, or inventar as the next step
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Redirect create success to branchesMenu(id). 2. Replace sales toast with menu/digital-menu messaging. 3. Align create description copy.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified: create success pushes routes.analytics.branchesMenu(id); toast uses createdDescription + openDigitalMenuAction (servicesDigitalMenuLocation); sales upload CTA removed from create path. pnpm typecheck passed.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Post-create now redirects to the location menu builder and toasts a Digital Menu action instead of upload-sales. Create copy aligns with menu-first onboarding. Verified via typecheck and code path review (browser blocked on Clerk login).

<!-- SECTION:FINAL_SUMMARY:END -->
