# Story 123: Add operation runner E2E and smoke checks

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 120

## Goal
Validate that queued operation jobs are actually consumed and reach terminal status.

## Why This Matters
- Prevents regressions to enqueue-only behavior.
- Ensures replay/retry user journey works in release checks.

## Scope
- Extend E2E for operations workflow:
  - queue replay/retry,
  - trigger runner path,
  - assert status progression (`queued` -> `running` -> terminal).
- Add smoke check for runner endpoint availability and claim behavior.

## Acceptance Criteria
- Automated tests fail if operation jobs remain perpetually queued.
- Release smoke includes operation-runner consumption signal.

## Deliverables
- Updated E2E specs and smoke checks.
