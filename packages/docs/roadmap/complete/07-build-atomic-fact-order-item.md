# Story 07: Build Atomic Fact (`fact_order_item`)

## Goal
Create the canonical atomic fact for downstream analytics and marts.

## Scope
- Build `warehouse.fact_order_item` from `stg_pos_clean`.
- Include foreign keys:
  - `date_key`
  - `location_key`
  - `menu_item_key`
  - `pos_source_key`
  - `pipeline_run_id`
- Include additive measures:
  - `qty`
  - `gross_revenue`
  - `net_revenue`
  - `discount`
  - `cogs`
  - `margin`

## Acceptance Criteria
- Fact grain is validated as one row per order line item.
- Referential integrity to dimensions is enforced.
- Fact load is incremental and idempotent.

## Deliverables
- Fact DDL and load model.
- Grain validation test.

## Status
`todo`
