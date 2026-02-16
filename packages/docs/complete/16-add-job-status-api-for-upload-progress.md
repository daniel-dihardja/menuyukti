# Story 16: Add Job Status API for Upload Progress

## Goal
Provide marketers with clear upload progress and completion visibility.

## Scope
- Add `GET /api/etl/jobs/:jobId`.
- Return lifecycle fields: `queued`, `running`, `succeeded`, `failed`.
- Include `started_at`, `finished_at`, and error message when failed.

## Acceptance Criteria
- Frontend can poll by `job_id` and render progress state.
- Failed jobs include actionable error text.
- Completed jobs link to created analytics snapshot.

## Deliverables
- Job status API route.
- Response contract doc.

## Status
`complete`
