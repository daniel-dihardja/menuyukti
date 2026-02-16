# Story 03: Add Pipeline Governance Core (`dim_pipeline_run`)

## Goal
Track lineage and run-level metadata for all ETL operations.

## Scope
- Create `warehouse.dim_pipeline_run` with fields:
  - `pipeline_run_id`
  - `schema_version`
  - `source_system`
  - `source_file`
  - `ingested_at_utc`
  - `quality_status`
- Ensure downstream writes include `pipeline_run_id`.

## Acceptance Criteria
- Every pipeline run creates one row in `dim_pipeline_run`.
- Downstream records can be traced to `pipeline_run_id`.
- Metadata values follow canonical contract `v1`.

## Deliverables
- Migration + insertion wiring.
- Run metadata propagation guide.

## Status
`todo`
