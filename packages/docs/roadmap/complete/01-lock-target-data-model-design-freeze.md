# Story 01: Lock Target Data Model (Design Freeze)

## Goal
Freeze the target warehouse model before implementation so grain and KPI ownership are unambiguous.

## Scope
- Define immutable table grains:
  - `fact_order_item`
  - `fact_menu_hourly`
  - `fact_menu_daily`
- Define KPI ownership (source-of-truth table per KPI).
- Publish design doc in `packages/docs/status`.

## Acceptance Criteria
- A single approved model spec exists.
- Every planned fact table has explicit grain definition.
- Every KPI has exactly one source of truth.

## Deliverables
- `packages/docs/status/warehouse-target-model-v1.md`

## Status
`todo`
