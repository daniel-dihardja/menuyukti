# Story 04: Implement Raw and Rejection Staging

## Goal
Capture replayable raw ingest rows and explicit rejection reasons.

## Scope
- Add `staging.stg_pos_raw` for normalized source rows.
- Add `staging.stg_pos_rejected` for invalid rows + reason codes.
- Add idempotency key strategy (`pipeline_run_id` + source row hash).

## Acceptance Criteria
- Raw ingest rows are persistently stored.
- Rejected rows include reason code and minimal context.
- Re-running same input does not duplicate rows.

## Deliverables
- Table migrations.
- Ingestion write path updates.
- Rejection reason enum/spec doc.

## Status
`todo`
