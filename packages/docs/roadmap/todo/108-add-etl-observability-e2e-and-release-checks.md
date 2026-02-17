# Story 108: Add ETL observability E2E and release checks

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 104

## Goal
Validate ETL run-history observability and recovery shortcuts with automated E2E coverage.

## Why This Matters
- Prevents regressions in operator-critical monitoring flows.
- Ensures release-gate includes complete ETL visibility checks.

## Scope
- Add E2E checks for:
  - run-history list visibility
  - succeeded/failed status rendering
  - filter application
  - recovery shortcut trigger behavior
- Extend release-gate checks for ETL observability smoke.

## Acceptance Criteria
- E2E suite verifies run-history UX and key interactions.
- Release-gate script includes observability checks.
- Artifacts captured on failure.

## Deliverables
- New/updated E2E specs.
- Package script updates if needed.

