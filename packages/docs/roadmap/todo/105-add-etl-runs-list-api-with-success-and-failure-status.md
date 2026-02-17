# Story 105: Add ETL runs list API with success and failure status

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 104

## Goal
Expose a dedicated API endpoint for ETL run history that includes succeeded, failed, queued, and running runs.

## Why This Matters
- Operations UI needs complete run history, not operation-only records.
- Enables filtering and triage without querying the database directly.

## Scope
- Add ETL runs list endpoint with filters:
  - locationId
  - status
  - date range
  - limit/pagination cursor
- Include key metadata (pipelineRunId, source file, timestamps, error summary, quality hints).

## Acceptance Criteria
- API returns succeeded and failed runs in the same response surface.
- Filters and validation behavior are deterministic and documented.
- API can be consumed independently by UI and E2E tests.

## Deliverables
- New/extended API route for ETL run listing.
- Request/response type definitions and tests.

