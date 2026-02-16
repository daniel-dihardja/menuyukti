# Story 08: Build Derived Facts (Hourly and Daily)

## Goal
Precompute high-value aggregates for heatmap, daypart, and menu-performance workloads.

## Scope
- Build:
  - `warehouse.fact_menu_hourly`
  - `warehouse.fact_menu_daily`
- Source from `fact_order_item`.
- Implement incremental loads with deterministic keys.

## Acceptance Criteria
- Aggregates are mathematically consistent with `fact_order_item`.
- Incremental reruns preserve correctness.
- Query performance improves for common dashboard workloads.

## Deliverables
- Derived fact models + validation checks.
- Reconciliation tests against atomic fact.

## Status
`todo`
