# Story 39: Remove Legacy Decision Module and Pipeline

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Delete unused legacy decision package and orchestration module.

## Scope
- Remove `packages/marketing-engine/src/marketing_engine/decision` directory.
- Remove `packages/marketing-engine/src/marketing_engine/pipeline.py`.
- Verify no remaining code imports from removed modules.

## Acceptance Criteria
- No code references `marketing_engine.decision` or `marketing_engine.pipeline`.
- Repository remains type/lint/test clean for relevant checks.

## Deliverables
- Deleted modules and cleaned references.
