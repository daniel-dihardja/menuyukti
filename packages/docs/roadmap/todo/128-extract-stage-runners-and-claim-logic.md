# Story 128: Extract stage runners and claim logic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Refactor execution into reusable stage runners with atomic claim semantics.

## Why This Matters
- Prevents duplicate processing and stuck `queued` jobs.
- Standardizes behavior across upload and operations-triggered workloads.

## Scope
- Implement runner service for stage jobs:
  - atomic claim
  - execute stage handler
  - write terminal status
- Separate handler modules for each stage.
- Support bounded worker loops (`limit` per run call).

## Acceptance Criteria
- Concurrent runner calls do not double-process same stage job.
- Stage handlers execute through shared runner abstraction.

## Deliverables
- Runner core service.
- Stage handler wiring.
