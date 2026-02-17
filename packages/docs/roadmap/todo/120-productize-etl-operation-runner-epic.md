# Story 120: Productize ETL operation runner epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Make queued retry/replay/backfill operations executable by adding a real runner/worker path.

## Why This Matters
- Operation jobs currently remain `queued` without a consumer.
- Marketers/analysts cannot recover pipelines if replay/retry never executes.

## Scope
- Add dequeue + execution flow for operation jobs.
- Add stale-queue handling and observability.
- Add validation and release docs updates.

## Acceptance Criteria
- Child stories 121-124 are completed.
- Queued operation jobs transition to `running` and terminal status.
- Operations UI no longer accumulates indefinitely stuck queued jobs.

## Deliverables
- Parent epic for ETL operation runner productization.
