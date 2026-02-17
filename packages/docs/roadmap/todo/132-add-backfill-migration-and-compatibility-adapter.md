# Story 132: Add backfill migration and compatibility adapter

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Migrate existing job records and keep backward compatibility while rolling out staged pipeline.

## Why This Matters
- Avoids breaking current endpoints/UI during refactor.
- Preserves historical records for audit/debug continuity.

## Scope
- Add migration/backfill script from legacy `etl_jobs` semantics to stage lineage model.
- Keep compatibility adapter so existing endpoints continue to function.
- Add rollout switch/flag for safe gradual activation.

## Acceptance Criteria
- Legacy and new records can be queried consistently during transition.
- No downtime or broken status pages during rollout.

## Deliverables
- Migration/backfill utility.
- Compatibility adapter layer.

## Dependencies
- Story 127: lineage schema/tables exist and are migration-ready.
