# Story 106: Add operations UI run-history table and filters

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 104

## Goal
Add an ETL run-history table in the operations page that shows successful and failed runs with filter controls.

## Why This Matters
- Operators need one place to see current operations and historical run outcomes.
- Faster diagnosis when analysts/marketers report stale or missing data.

## Scope
- Add ETL run-history table to `/analytics/operations`.
- Add filters (status, date window, location, search by pipelineRunId/source).
- Show key columns (status, pipelineRunId, start/end times, duration, error summary).

## Acceptance Criteria
- UI clearly displays succeeded and failed runs together.
- Filters apply correctly and preserve usability for large result sets.
- Empty/error states are explicit and actionable.

## Deliverables
- UI components/state for run history listing and filters.
- UX copy for empty/error/filter states.

