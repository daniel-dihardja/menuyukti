---
id: TASK-3
title: Unify feature flags and MVP-hide inventar, team, POS, sales reports
status: Done
assignee: []
created_date: '2026-10-26T09:38:00Z'
updated_date: '2026-10-26T09:41:00Z'
labels:
  - web
dependencies: []
references:
  - apps/web/config/feature-flags.json
  - apps/web/lib/feature-flags.ts
priority: high
type: enhancement
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Release control is split across feature-flags.json (nav/routes) and admin-only-features.json (audience). Operators still see inventar, team, POS, and sales report upload on the first-release path, but those surfaces should stay in the codebase without being discoverable. One catalog with enabled + audience keeps kill switches and admin gating in a single place.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Single feature-flags.json catalog defines enabled and audience for former feature-flag and admin-only surfaces
- [x] #2 inventar, team, POS, and sales reports are hidden from nav and blocked by route/CTA gates while code remains
- [x] #3 Admin-only surfaces (calendar, CRM, shop, staff, IG Studio, selected analytics reports) still require platform admin when enabled
- [x] #4 Feature-flag unit tests cover MVP offs, admin audience, and nested analytics path matching
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Rewrite feature-flags.json as a features catalog (enabled + audience); delete admin-only-features.json.
2. Implement catalog resolution in lib/feature-flags.ts (prefixes, \* patterns, nav/action/segment helpers); keep existing public API names.
3. Retarget admin-only imports to feature-flags; delete admin-only-features.ts; update comments.
4. Filter location-detail-actions overflow items by enabled/audience.
5. Merge tests; note MVP gates in menuyukti-features.md; run web tests + typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified: vitest tests/lib/feature-flags.test.ts (10 passed); pnpm typecheck in apps/web. admin-only-features.json/ts removed; imports retargeted to feature-flags.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Merged admin-only into a single feature-flags.json catalog (enabled + audience). MVP-disabled inventar, team, POS, and sales reports via nav/route/CTA gates without deleting code. Admin-audience surfaces still require platform admin. Tests and web typecheck pass.

<!-- SECTION:FINAL_SUMMARY:END -->
