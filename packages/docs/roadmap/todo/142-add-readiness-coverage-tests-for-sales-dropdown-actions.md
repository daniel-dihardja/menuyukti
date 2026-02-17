# Story 142: Add readiness coverage tests for sales dropdown actions

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 139

## Goal
Add test coverage for dropdown action readiness states and guarded navigation behavior.

## Why This Matters
- UI gating is easy to regress when features evolve.
- MVP flow clarity requires stable, test-backed behavior.

## Scope
- Add unit/integration tests for readiness mapping logic.
- Add UI tests for enabled/disabled states and reasons.
- Cover at least:
  - no COGS data
  - COGS complete
  - attribution data missing/present

## Acceptance Criteria
- Tests fail when action readiness mapping or UI gating regresses.
- Test suite remains deterministic and fast.

## Deliverables
- Readiness and dropdown behavior tests.

## Dependencies
- Stories 140-141.
