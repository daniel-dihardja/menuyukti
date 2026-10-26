---
id: TASK-5.8
title: 'Deferred: archive or split POS cashier code after Order Board owns prep'
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:29:00Z'
labels:
  - web
  - graphql
  - pos
dependencies:
  - TASK-5.3
  - TASK-5.4
references:
  - apps/web/app/(protected)/analytics/locations/[id]/pos/
  - apps/web/app/api/locations/[id]/pos/route.ts
parent_task_id: TASK-5
priority: low
type: chore
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Once the Order Board fully owns staff prep UX, the POS cashier UI and unused cashier BFF actions add confusion while POS remains on hold. Cleanup should wait until the board is live so guest ordering is not broken by premature deletion.

Deferred intentionally: prefer freeze (5.1) first; delete or module-split only after Orders is proven.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Staff prep for digital-menu orders does not depend on pos-cashier components
- [x] #2 Unused cashier-only UI/BFF entry points are removed, relocated under a deferred path, or clearly marked deferred without breaking guest submit or Order Board
- [x] #3 No required deletion of pos_order persistence used by digital-menu orders unless a separate MenuOrder migration task exists
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Inventory POS cashier UI, BFF, CTAs, feature-flag gates, and tests.
2. Remove or relocate cashier-only surfaces so digital-menu Orders do not depend on them.
3. Keep pos_order persistence + public-menu submit/prep/Orders BFF intact.
4. Simplify feature flags / nav so disabled POS does not add ongoing branching noise where safe.
5. Tests + finalize.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Removed live POS cashier surface: deleted analytics/.../pos UI and /api/.../pos BFF, overflow POS CTA, branchesPos, pos feature flag, pos.json i18n, and cashier-only GraphQL client docs. Order board + public-menu submit remain on PosOrder persistence via /api/.../orders and trimmed pos-orders.ts. Updated glossary/skills/README/conventions. Verified vitest feature-flags + prep-status; apps/web typecheck clean.

<!-- SECTION:FINAL_SUMMARY:END -->
