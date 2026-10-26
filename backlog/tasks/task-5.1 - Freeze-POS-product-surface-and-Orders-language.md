---
id: TASK-5.1
title: Freeze POS product surface and Orders language
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:14:00Z'
labels:
  - web
  - digital-menu
  - pos
dependencies: []
references:
  - apps/web/config/feature-flags.json
  - .agents/menuyukti-features.md
  - apps/web/app/(protected)/services/digital-menu/
parent_task_id: TASK-5
priority: high
type: chore
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

POS is already MVP-gated off (TASK-3), but digital-menu onboarding and operator copy can still imply cashier/POS is the place to handle guest orders. With POS development on hold, operators need a clear product story: Orders board owns fulfillment; POS stays dormant code without discoverable CTAs.

This story hardens the freeze and establishes Orders naming so later board work does not leak POS language into the live path.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 pos feature flag remains disabled; /analytics/locations/\*/pos stays route-gated and absent from primary location CTAs
- [x] #2 Feature glossary / operator-facing digital-menu copy does not instruct staff to use POS cashier for guest orders
- [x] #3 Documented product rule: new fulfillment work ships under Orders / Digital Menu, not under POS cashier
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Confirm pos flag remains off; no new POS CTAs.
2. Update menuyukti-features.md: POS deferred; Orders board under Digital Menu.
3. Soften digital-menu operator copy that points at POS.
4. Extend feature-flags tests for POS off and digital-menu orders path on.
5. Verify AC and finalize.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Hardened POS freeze and Orders language: glossary + feature-flag descriptions document POS deferred and Order board under Digital Menu; console fulfillment copy points staff at the Order board (not cashier); feature-flags tests assert POS off and /services/digital-menu/\*/orders on. Verified with vitest feature-flags.test.ts (12 passed).

<!-- SECTION:FINAL_SUMMARY:END -->
