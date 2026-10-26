---
id: TASK-1.5
title: 'Location detail IA: Menu primary; demote POS, COGS, inventar'
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T08:09:00Z'
updated_date: '2026-10-26T09:10:00Z'
labels:
  - web
  - locations
  - digital-menu
  - onboarding
dependencies: []
references:
  - apps/web/app/(protected)/analytics/locations/[id]/page.tsx
  - apps/web/app/(protected)/analytics/locations/location-detail-actions.tsx
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Location detail header currently lists manage Reports, COGS, Menu, and POS as peer outline buttons. For this release POS, COGS, and inventar are not necessary to try digital menu; peer placement implies they are part of the core setup. Reorient chrome so Menu / digital menu are primary and ops surfaces are secondary or hidden on this path.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Location detail primary actions emphasize Menu and/or digital menu
- [x] #2 POS, COGS, and inventar are not presented as equal peer primary actions on the default location detail path for this release
- [x] #3 Reports/analytics entry is not required to complete digital-menu onboarding from location detail
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add LocationDetailActions client: primary Manage menu, outline Digital Menu, ResponsiveActionMenu for Reports/COGS/POS.
2. Wire into [id]/page header; add i18n keys.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Header uses LocationDetailActions: primary Manage menu, outline Digital Menu, ResponsiveActionMenu for Reports/COGS/POS. Inventar not added to detail chrome.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Location detail header now prioritizes Manage menu and Digital Menu; Sales reports, COGS, and POS live in ResponsiveActionMenu overflow. Inventar is not elevated on detail. Verified with web typecheck.

<!-- SECTION:FINAL_SUMMARY:END -->
