# Story 116: Fix attribution KPI currency by location epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Ensure attribution KPI money values use the location/branch currency from DB instead of a hardcoded `$`.

## Why This Matters
- Currency display must match branch context for decision accuracy.
- Hardcoded `$` can mislead marketers and analysts in non-USD branches.

## Scope
- Update attribution KPI formatting to use `branches.currency_code`.
- Add safeguards/fallback behavior when currency is missing.
- Add validation coverage and documentation updates.

## Acceptance Criteria
- Child stories 117-119 are completed.
- `/analytics/{analyticsId}/attribution` KPI cards show DB-driven currency code.
- No hardcoded `$` remains in attribution KPI money formatting.

## Deliverables
- Parent epic for attribution currency-display fix.
