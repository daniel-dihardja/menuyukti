# Story 18: Add POS Data Quality Rule Pack

## Goal
Improve trust in marketer-facing metrics by enforcing required-field quality rules.

## Scope
- Add row-level checks for required fields:
  - `bill_number`
  - `menu`
  - `qty`
  - `price`
  - `order_time`
- Persist rejection reason per row.
- Produce per-run quality summary counts.

## Acceptance Criteria
- Invalid rows are rejected with explicit reason.
- Quality summary is persisted for each run.
- Downstream facts only use clean rows.

## Deliverables
- Validation module update.
- Rejection reason dictionary doc.

## Status
`complete`
