---
id: TASK-5.2
title: Staff APIs for digital-menu order list, prep advance, and cancel
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:16:00Z'
labels:
  - graphql
  - web
  - orders
dependencies: []
references:
  - apps/graphql/schema/mutations/pos_orders.py
  - apps/graphql/schema/queries/pos_orders.py
  - apps/graphql/services/pos_order_lifecycle.py
  - apps/graphql/services/pos_order_constants.py
  - apps/web/app/api/locations/[id]/pos/route.ts
parent_task_id: TASK-5
priority: high
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Staff can only advance digital-menu prep from the gated POS cashier BFF today. An Order Board needs location-scoped list, forward prep advance, and cancel/void for open guest tickets without cashier pay/close flows.

Reuse existing prep machine (received → preparing → ready → served|picked_up|delivered) and digital_menu-tagged tickets; expose them through Orders-named GraphQL/BFF surfaces rather than requiring /api/locations/[id]/pos.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Authenticated location owner (or equivalent staff auth already used for location ops) can list open digital-menu orders for a location filtered by prep status
- [x] #2 Staff can advance prep one step forward for a digital-menu order; terminal and invalid transitions are rejected safely (idempotent / no double-jump)
- [x] #3 Staff can cancel/void an open digital-menu order with a clear outcome so it leaves the active board
- [x] #4 Cashier-only mutations (open walk-up ticket, close/pay, refund, day summary) are not required to operate the board
- [x] #5 Web BFF for the board does not depend on the POS cashier route being feature-enabled
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Extend list_orders + posOrders with optional note and prep_status filters.
2. Add web GraphQL docs for filtered list (reuse advance/void docs).
3. Add /api/locations/[id]/orders BFF with list, advancePrep, void only.
4. Extend GraphQL tests for filtered digital_menu list.
5. Verify AC and finalize.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Extended posOrders/list_orders with note + prepStatus filters; added DIGITAL_MENU_ORDERS_QUERY and /api/locations/[id]/orders BFF (GET list, POST advancePrep|void only — independent of POS flag). Verified with pytest tests/test_pos_prep_status.py (11 passed).

<!-- SECTION:FINAL_SUMMARY:END -->
