# Story 127: Add pipeline run and stage lineage model

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Add explicit run/stage lineage persistence to support reproducibility and partial retries.

## Why This Matters
- Current `etl_jobs` records status but not full stage lineage.
- Reliable replay/recovery requires stage-level traceability.

## Scope
- Add/extend schema for:
  - pipeline run entity
  - pipeline stage execution entity
  - stage input/output references
- Track timestamps, actor/source, errors, and retry counters per stage.
- Keep compatibility with existing `etl_jobs` during migration.

## Acceptance Criteria
- Each pipeline action can be traced to run + stage records.
- Stage lineage supports deterministic debugging and audit.

## Deliverables
- Prisma schema + migration.
- Basic lineage write path integration.
