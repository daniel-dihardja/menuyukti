# Story 15: Add Async Upload Job Queue

## Goal
Prevent long blocking uploads by moving heavy ETL from request-response into background jobs.

## Scope
- Create a job record on upload request.
- Enqueue ETL execution with `queued` status.
- Return `job_id` immediately to the client.

## Acceptance Criteria
- Upload endpoint returns quickly with `job_id`.
- No full ETL execution happens in the upload HTTP request.
- Job status starts as `queued`.

## Deliverables
- Upload API update.
- Job table/model for queue metadata.

## Status
`complete`
