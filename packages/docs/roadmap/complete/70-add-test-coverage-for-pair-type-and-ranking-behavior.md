# Story 70: Add Test Coverage for Pair Type and Ranking Behavior

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Protect pair-type logic and scoring behavior with unit and e2e tests.

## Why This Matters
- Prevents silent regressions in business-critical ranking logic.
- Ensures confidence before shipping to restaurant users.

## Scope
- Add unit tests for classification and score adjustment.
- Add e2e tests for pair-type filter and visible ranking impact.
- Include at least one positive `food_drink` scenario.

## Acceptance Criteria
- New tests pass locally/CI.
- Tests fail if pair-type boost/filter logic regresses.

## Deliverables
- Unit tests + e2e coverage for pair-type feature.

