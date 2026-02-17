# Story 99: Add pipeline retry/replay/backfill API actions

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 98

## Goal
Provide explicit API actions for retry, replay, and backfill operations scoped by location/run/time window.

## Why This Matters
- Creates a stable operational control plane for recovery workflows.
- Removes ad-hoc manual DB/script-based recovery steps.

## Scope
- Add action endpoints/route actions for:
  - retry failed run
  - replay selected run context
  - backfill date window
- Include request validation and deterministic action payload contracts.
- Emit operation records for status tracking.

## Acceptance Criteria
- API supports all three operations with clear request/response shapes.
- Invalid or unsafe requests return explicit validation errors.
- Operation records are queryable for status/debugging.

## Deliverables
- API implementation for retry/replay/backfill actions.
- Contracted request/response types.
- Unit/integration tests for success and validation failures.

