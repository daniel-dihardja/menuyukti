---
id: TASK-5.3
title: Order Board UI with status columns and one-tap advance
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
  - TASK-5.2
references:
  - apps/web/app/(protected)/analytics/locations/[id]/pos/pos-cart-panel.tsx
  - apps/web/app/(protected)/analytics/locations/[id]/pos/pos-ops-sheet.tsx
  - apps/web/app/(protected)/services/digital-menu/
parent_task_id: TASK-5
priority: high
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Kitchen/counter staff need a phone- and tablet-friendly board to see new guest orders and move them through prep without a POS cart. Prep advance UI currently lives inside pos-cart-panel and is unreachable while POS is flagged off.

MVP board: columns or tabs for New (received/pending), Preparing, Ready, and Done (terminal today); cards show order identity, age, fulfillment mode, table/pickup/delivery context, and lines; primary action advances one step.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Staff see active digital-menu orders grouped by prep stage (New / Preparing / Ready / Done)
- [x] #2 Each active card shows enough context to fulfill (items, mode, table or pickup/delivery fields, time since placed)
- [x] #3 One primary control advances the order to the next prep status; Done uses mode-appropriate terminal labels (served / picked up / delivered)
- [x] #4 Cancel is available as a secondary action for open orders
- [x] #5 Operator-facing strings use Orders / board language (next-intl); no requirement to open POS cashier
- [x] #6 Board works on phone and tablet viewport widths used at the counter
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Extract shared prep helpers from pos-utils into lib/orders.
2. Add Order Board page + client under digital-menu/[locationId]/orders.
3. Columns/tabs New/Preparing/Ready/Done; advance + cancel via Orders BFF; ~5s poll.
4. Add en/de (en) i18n under services.digitalMenu.orders.
5. Verify AC and finalize.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Shipped Order Board at /services/digital-menu/[locationId]/orders with New/Preparing/Ready/Done (tabs mobile, columns desktop), advance + cancel via Orders BFF, shared prep helpers in lib/orders, en i18n. Poll ~5s. Verified prep-status vitest + web typecheck.

<!-- SECTION:FINAL_SUMMARY:END -->
