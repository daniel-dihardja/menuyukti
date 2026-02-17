# Story 96: Add COGS completeness E2E validation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 92

## Goal
Add release-grade E2E checks for COGS completeness KPIs, watchlist behavior, and export fields.

## Why This Matters
- Protects a high-impact analyst trust workflow from regressions.
- Verifies UI-export consistency under realistic data states.

## Scope
- Add/extend E2E scenarios for:
  - KPI visibility
  - watchlist rendering
  - export completeness fields
- Capture artifacts for failure diagnostics.

## Acceptance Criteria
- E2E checks pass in release test workflow.
- Failures produce artifacts (screenshot/video/log).
- Coverage includes at least one low-completeness scenario.

## Deliverables
- New/updated E2E spec files.
- Script wiring in package scripts if needed.

