# Story 38: Deprecate Decision Pipeline Endpoint

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Remove runtime dependency on the legacy decision engine endpoint.

## Scope
- Remove `/decision/pipeline` request model and handler from analytics service.
- Remove imports used only by the decision endpoint.

## Acceptance Criteria
- Analytics service no longer imports decision pipeline modules.
- Service starts without decision endpoint code paths.

## Deliverables
- Updated `apps/analytics/app/main.py`.
