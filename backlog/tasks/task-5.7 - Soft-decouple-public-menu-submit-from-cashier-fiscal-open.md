---
id: TASK-5.7
title: Soft-decouple public-menu submit from cashier fiscal open
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:19:00Z'
labels:
  - graphql
  - orders
  - digital-menu
dependencies:
  - TASK-5.2
references:
  - apps/graphql/services/pos_order_lifecycle.py
  - apps/graphql/schema/mutations/submit_public_menu_order.py
  - apps/web/app/api/public-menu/orders/route.ts
parent_task_id: TASK-5
priority: medium
type: enhancement
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Guest submit still goes through open_order (register, bill number, optional fiscal start) even though restaurants already have an external POS and Menuyukti POS is on hold. Fulfillment-only ordering should not depend on cashier sale semantics.

Keep digital_menu tickets and prep lifecycle; remove or soft-skip fiscal/register assumptions that are unnecessary for Order Board MVP. Full MenuOrder table migration remains out of scope unless this soft-decouple is insufficient.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Public menu order create still yields a trackable order with prep_status=received and fulfillment fields
- [x] #2 Creating a digital-menu order does not require the POS cashier feature flag or cashier UI
- [x] #3 Fiscal sale start is skipped or no-ops safely for fulfillment-only digital-menu opens when POS/fiscal is not the product path
- [x] #4 Existing guest poll/restore APIs continue to work for new orders
- [x] #5 Automated tests cover submit + prep advance without assuming pay/close
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. open_order(start_fiscal=...); public submit uses False.
2. Test spy asserts skip vs cashier open.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

submit_public_menu_order opens tickets with start_fiscal=False; cashier open_order still starts fiscal by default. Verified test_public_menu_submit_skips_fiscal_start + prep/submit suites (28 passed).

<!-- SECTION:FINAL_SUMMARY:END -->
