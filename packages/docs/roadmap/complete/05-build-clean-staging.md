# Story 05: Build Clean Staging (`stg_pos_clean`)

## Goal
Provide one typed and validated handoff layer between raw ingest and warehouse facts.

## Scope
- Create `staging.stg_pos_clean`.
- Standardize column names/types (canonical transport shape).
- Enforce non-null and type validation rules for required columns.

## Acceptance Criteria
- `stg_pos_clean` contains only validated rows.
- No analytic model reads directly from `stg_pos_raw`.
- Type contracts match canonical schema definitions.

## Deliverables
- Clean staging model/table.
- Transformation SQL or pipeline logic.
- Validation rule documentation.

## Status
`todo`
