# Story 122: Add stale queued guardrails and recovery

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 120

## Goal
Prevent indefinite `queued` operation jobs and provide deterministic stale-queue recovery.

## Why This Matters
- Without guardrails, broken runner conditions create silent operational deadlocks.
- Operators need clear recovery behavior for old queued jobs.

## Scope
- Define stale threshold for queued jobs (config/env driven).
- Add runner pre-check that marks over-threshold queued jobs as failed with reason code.
- Ensure conflict detection ignores stale/failed jobs correctly.
- Improve UI-facing message for stale queue scenarios.

## Acceptance Criteria
- Old queued jobs are auto-resolved to failed with clear reason.
- New operation requests are not blocked forever by stale queued records.
- Recovery guidance is visible in operation status messaging.

## Deliverables
- Stale queue policy implementation.
- Status/error code updates for stale queue recovery.
