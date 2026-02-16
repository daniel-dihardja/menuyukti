# Story 06: Create Conformed Dimensions

## Goal
Introduce conformed dimensions for reuse across marts and stable joins.

## Scope
- Create:
  - `warehouse.dim_date`
  - `warehouse.dim_location`
  - `warehouse.dim_pos_source`
  - `warehouse.dim_menu_item`
- For `dim_menu_item`, implement SCD2 strategy if category/detail can change.
- Define natural-key-to-surrogate-key mapping process.

## Acceptance Criteria
- Fact tables can reference all dimensions via surrogate keys.
- `dim_menu_item` change handling behavior is documented and tested.
- Dimension population is incremental and deterministic.

## Deliverables
- Dimension DDL + load logic.
- SCD2 behavior notes for `dim_menu_item`.

## Status
`todo`
