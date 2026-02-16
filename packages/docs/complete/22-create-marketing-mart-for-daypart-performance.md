# Story 22: Create Marketing Mart for Daypart Performance

## Goal
Provide marketers a ready-to-query dataset for best posting windows.

## Scope
- Create mart view/table aggregated by:
  - location
  - menu category
  - daypart
  - weekday/weekend
- Include `qty`, `net_revenue`, `margin` measures.

## Acceptance Criteria
- Mart refreshes from warehouse facts per pipeline run.
- Daypart outputs match source fact totals within tolerance.
- Consumers can query without joining raw fact tables.

## Deliverables
- Mart DDL (view/materialized view/table).
- Validation query script.

## Status
`complete`
