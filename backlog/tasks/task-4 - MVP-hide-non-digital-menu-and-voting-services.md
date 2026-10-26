---
id: TASK-4
title: MVP-hide non digital-menu and voting services
status: Done
assignee: []
created_date: '2026-10-26T09:44:00Z'
updated_date: '2026-10-26T09:46:00Z'
labels:
  - web
dependencies: []
references:
  - apps/web/config/feature-flags.json
  - apps/web/app/(protected)/services/page.tsx
priority: medium
type: enhancement
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Services catalog still lists pick-and-win, point system, pickup offer, and coming-soon loyalty cards. First release should only surface digital menu and voting; other service UIs stay in the repo but hidden and route-gated like inventar/POS.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Services catalog shows only digital menu and voting (empty categories omitted)
- [x] #2 Routes for pick-and-win, point-system, and pickup-offer are feature-disabled
- [x] #3 Subscriptions overview only lists enabled service keys
- [x] #4 Feature-flag tests cover the new service flags
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add per-service feature entries (digital-menu + voting on; others off) with route prefixes where applicable; add serviceKeys mapping.
2. Export isFeatureEnabled and isServiceKeyFeatureEnabled; filter services catalog and subscriptions overview.
3. Extend feature-flags tests; typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified: vitest feature-flags (11 passed); pnpm typecheck. Catalog filters by isServiceKeyFeatureEnabled; empty categories omitted; routes gated.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

MVP services catalog now shows only digital menu and voting. Other services (pick-and-win, point system, pickup offer, stamp/cashback) are feature-disabled with routes blocked; code retained. Tests and typecheck pass.

<!-- SECTION:FINAL_SUMMARY:END -->
