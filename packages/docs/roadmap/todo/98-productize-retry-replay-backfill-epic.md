# Story 98: Productize retry/replay/backfill operations epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Deliver productized retry/replay/backfill operations so failed or stale pipelines can be recovered safely and quickly.

## Why This Matters
- Closes open feature `H3` in release specs.
- Reduces manual operational burden and recovery time.
- Improves trust across matrix, scheduler, heatmap, and attribution workflows.

## Scope
- Define API actions, orchestration safety rules, operator workflow surface, and release validation/docs updates.
- Ensure idempotent and auditable run triggering behavior.

## Acceptance Criteria
- Child stories 99-103 are completed.
- Operators can trigger safe retry/replay/backfill actions with clear status visibility.
- Release docs and specs reflect shipped operational capabilities.

## Deliverables
- Parent epic to group and track retry/replay/backfill implementation stories.

