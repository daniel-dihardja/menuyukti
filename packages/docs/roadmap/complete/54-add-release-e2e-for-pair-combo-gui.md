# Story 54: Add Release E2E for Pair/Combo GUI

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Add E2E coverage for the GUI pair/combo workflow to protect release quality.

## Why This Matters
- Prevents regressions in a business-critical analyst workflow.

## Scope
- Add E2E scenario for opening pairs page, applying filters, and validating table outputs.
- Validate export actions are reachable from GUI.
- Capture artifacts for debugging.

## Acceptance Criteria
- E2E script runs with deterministic pass/fail.
- Pair/combo GUI elements are asserted, not just page render.

## Deliverables
- New E2E script + npm script wiring.
