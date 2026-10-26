---
id: TASK-5.4
title: Order Board entry points under Digital Menu and location
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:19:00Z'
labels:
  - web
  - orders
  - digital-menu
dependencies:
  - TASK-5.3
references:
  - apps/web/lib/routes.ts
  - apps/web/app/(protected)/analytics/locations/[id]/
  - apps/web/app/(protected)/services/digital-menu/
  - apps/web/config/feature-flags.json
parent_task_id: TASK-5
priority: high
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Even with a board page, operators will not find it if navigation stays Menu/POS-shaped. Orders must be a first-class entry next to Digital Menu setup — never behind the disabled POS flag.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 From Digital Menu service/location flows, operators can open the Order Board for that location in one or two clicks
- [x] #2 Location detail or service chrome presents Orders as a peer (or clearly secondary) action to Menu / Digital Menu — not nested under POS
- [x] #3 Order Board route is reachable when digital menu is enabled even if pos.enabled is false
- [x] #4 Deep link / named route helper exists for the board (stable URL per location)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. routes.servicesDigitalMenuOrders.
2. Console CTA + location detail peer button.
3. Verify path not behind pos flag.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Added routes.servicesDigitalMenuOrders; Digital Menu console CTA; location detail peer Order board button (not under POS). Path gated by serviceDigitalMenu only. Feature-flag tests cover /orders path.

<!-- SECTION:FINAL_SUMMARY:END -->
