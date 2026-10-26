---
id: TASK-1.6
title: Create single-screen UX
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T09:21:00Z'
updated_date: '2026-10-26T09:26:00Z'
labels:
  - web
  - locations
  - onboarding
dependencies: []
references:
  - apps/web/app/(protected)/analytics/locations/location-form.tsx
  - >-
    apps/web/app/(protected)/analytics/locations/location-form-basics-section.tsx
  - apps/web/messages/en/analytics.json
parent_task_id: TASK-1
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Create still uses Basics/Hours tabs and a duplicate in-form title, so naming a venue feels like an admin settings panel. Operators need a single mobile screen: name, live menu-link preview, slug under Edit link, and optional hours.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Create mode renders without Basics/Hours tabs
- [x] #2 Name field shows a live public menu URL preview; slug is editable under an Edit link control
- [x] #3 Opening hours on create are optional and live in a collapsed Add opening hours block
- [x] #4 Duplicate in-form create title is removed; page PageHeading remains
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Create mode: no Tabs; stack basics + optional hours. 2. Live menu URL preview + Edit link for slug. 3. Remove in-form create title. 4. i18n copy for Menu link framing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Create mode stacks basics + collapsed Add opening hours without Tabs; live menu path preview via routes.public.locationMenu; slug under Edit link; in-form createTitle removed.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Create is a single mobile screen: name, live guest menu link preview, optional Edit link for slug, and collapsed optional hours. Duplicate in-form title removed. Verified with typecheck; interactive browser check blocked on login.

<!-- SECTION:FINAL_SUMMARY:END -->
