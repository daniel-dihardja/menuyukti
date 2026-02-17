# Story 136: Disable or remove operations API surface

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 134

## Goal
Disable or remove non-MVP operations API endpoints and runner triggers.

## Why This Matters
- Prevents accidental use of low-value operational controls.
- Reduces maintenance burden and edge-case error handling for MVP.

## Scope
- Disable/remove `/api/etl/operations` and `/api/etl/operations/run` for MVP mode.
- Return deterministic errors if endpoints are retained for compatibility.
- Keep required ETL APIs for upload status and core analytics generation.

## Acceptance Criteria
- Operations API actions are not available in MVP mode.
- Core ETL upload and analytics APIs continue to function.

## Deliverables
- API de-scope patch with explicit behavior.

## Dependencies
- Story 134.
