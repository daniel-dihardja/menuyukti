# Story 133: Add E2E/release-gate and docs updates for staged pipeline

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Validate staged pipeline behavior end-to-end and align docs/specs to release state.

## Why This Matters
- Refactor must be provably safe for both upload and COGS scenarios.
- Documentation must match shipped orchestration behavior.

## Scope
- Add/extend E2E coverage:
  - upload -> ingest stage -> matrix availability
  - cogs update -> downstream recompute only
  - retry/replay lifecycle in staged runner
- Update release-gate checks for staged orchestration assertions.
- Update manual + `SPECS.md` to reflect implemented staged model.

## Acceptance Criteria
- E2E and release-gate cover both pipeline scenarios and status transitions.
- Docs/specs contain no unreleased claims.

## Deliverables
- Updated tests/scripts.
- Manual/spec updates for staged pipeline.

## Dependencies
- Stories 128-132: staged runner, idempotency, read-path, observability, and compatibility changes are implemented.
