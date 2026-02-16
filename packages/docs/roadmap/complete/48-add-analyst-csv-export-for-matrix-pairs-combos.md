# Story 48: Add Analyst CSV Export for Matrix/Pairs/Combos

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Provide exportable analyst outputs for weekly offline review and stakeholder sharing.

## Why This Matters
- Analyst teams often need CSV handoff and archival.

## Scope
- Add CSV export endpoints for matrix, pair metrics, and combo opportunities.
- Preserve active filters in exported payloads.
- Ensure exported columns are stable and documented.

## Acceptance Criteria
- CSV exports match filtered UI/API result sets.
- Export schema is consistent across runs.
- Exports include metadata (location, period, generated_at).

## Deliverables
- Export endpoints + lightweight tests.
