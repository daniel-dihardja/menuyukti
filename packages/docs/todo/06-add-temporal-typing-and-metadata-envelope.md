# TODO 06: Add Temporal Typing And Metadata Envelope

## Goal
Add production-ready temporal typing and metadata governance envelope to canonical payloads.

## Commit Scope
- Replace string temporal fields with typed date/datetime where appropriate.
- Standardize UTC handling for timestamps.
- Add metadata envelope fields:
  - `schema_version`
  - `source_system`
  - `pipeline_run_id`
  - `ingested_at_utc`
  - `quality_status`
- Populate safe defaults at boundaries.

## Out Of Scope
- Breaking changes for existing callers.

## Acceptance Criteria
- Canonical payloads include metadata envelope.
- Temporal fields are typed and validated.
- Existing clients continue functioning through compatibility handling.

## Validation
- `uv run pytest packages/marketing-engine/tests -q`
- Endpoint smoke checks for analytics and decision flows.

## Status
`todo`
