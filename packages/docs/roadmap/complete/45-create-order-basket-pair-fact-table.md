# Story 45: Create Order Basket Pair Fact Table

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Create deterministic co-purchase pair facts from order-item grain data.

## Why This Matters
- Pair/combination analytics requires canonical basket-pair facts.

## Scope
- Build pair fact at order-level combinations (menu_item_a, menu_item_b).
- Normalize pair ordering to avoid duplicate mirrored pairs.
- Add run/date/location indexing for efficient aggregation.

## Acceptance Criteria
- Pair fact table is populated from warehouse order-item facts.
- Pair rows are unique per order/pair combination.
- Backfill/recompute can run idempotently per pipeline run.

## Deliverables
- Schema/migration + ETL load SQL for basket pair fact.
