# Story 121: Add operation job claim and runner API

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 120

## Goal
Add an internal operation-runner path that claims queued operation jobs and executes them.

## Why This Matters
- `POST /api/etl/operations` currently enqueues only; no worker consumes queued jobs.
- Replay/retry/backfill must move beyond `queued` to deliver value.

## Scope
- Add runner endpoint/service (for cron/worker trigger) that:
  - selects oldest queued operation job,
  - atomically claims it (`queued` -> `running`, `startedAt` set),
  - parses operation payload from `sourceFile`,
  - executes action-specific ETL rerun behavior,
  - writes terminal status (`succeeded`/`failed`) with `finishedAt`.
- Add deterministic lock/claim behavior to avoid double-processing.

## Acceptance Criteria
- Runner can process at least one queued replay operation end-to-end.
- Claimed jobs cannot be double-claimed by concurrent runner calls.
- Failed execution paths set actionable error details.

## Deliverables
- Operation runner API/service implementation.
- Claiming/locking logic for operation jobs.
