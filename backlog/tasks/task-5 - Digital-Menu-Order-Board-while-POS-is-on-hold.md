---
id: TASK-5
title: Digital Menu Order Board while POS is on hold
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:07:00Z'
updated_date: '2026-10-26T16:19:00Z'
labels:
  - web
  - graphql
  - digital-menu
  - orders
dependencies: []
references:
  - apps/graphql/services/pos_order_constants.py
  - apps/graphql/services/pos_order_lifecycle.py
  - apps/web/app/(public)/[slug]/menu/public-menu-catalog.tsx
  - apps/web/app/(protected)/analytics/locations/[id]/pos/
  - apps/web/config/feature-flags.json
  - apps/web/app/(protected)/services/digital-menu/
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Native POS development is on hold, but restaurants still need to receive and progress digital-menu orders without opening a cashier. Today guest submit creates PosOrder rows (note=digital_menu) with a prep lifecycle, while staff prep advance lives only inside the MVP-gated POS cashier — so operators have no usable fulfillment surface.

Scope of this epic: freeze POS as a dormant product surface; ship a dedicated Order Board under Digital Menu for pending → preparing → ready → closed (terminal prep); expose staff list/advance/cancel APIs; align guest status copy; optionally soft-decouple submit from fiscal/cashier open. Persistence may keep using digital_menu PosOrder rows for MVP (Option 1); a separate MenuOrder table is out of scope unless fiscal coupling blocks the board.

Out of scope: building cashier pay/close/refund/day-Z features; deleting POS backend models; full KDS station routing; realtime subscriptions (polling is fine for MVP); SMS/push notify (follow-on).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Operators can manage digital-menu orders on a dedicated Order Board without using the POS cashier
- [x] #2 POS cashier remains undiscoverable (feature flag off); no new POS cashier work is required for order fulfillment
- [x] #3 Guest submit and prep status tracking continue to work for public menu orders
- [x] #4 Order Board uses product language Orders / Order board, not POS tickets, in operator-facing UI
- [x] #5 POS code deletion or MenuOrder table split is deferred until the board owns staff prep UX
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Recommended delivery order:

1. TASK-5.1 (freeze) and TASK-5.2 (APIs) in parallel
2. TASK-5.3 board UI → TASK-5.4 entry points
3. TASK-5.5 guest copy can parallel board UI
4. TASK-5.6 alerts after board
5. TASK-5.7 soft-decouple fiscal after APIs (can follow board MVP)
6. TASK-5.8 cleanup only after board owns prep

Persistence decision for MVP: reuse digital_menu PosOrder + prep_status (Option 1). Separate MenuOrder table only if 5.7 is insufficient.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Completed TASK-5.1–5.7: POS freeze + Orders language; staff list/advance/void BFF; Order Board UI under Digital Menu with entry points, guest copy, poll alerts, and fiscal skip on public-menu submit. TASK-5.8 (POS cashier cleanup) remains deferred by design. Verified GraphQL submit/prep tests (28) and web vitest (feature-flags, prep-status, pos-utils).

<!-- SECTION:FINAL_SUMMARY:END -->
