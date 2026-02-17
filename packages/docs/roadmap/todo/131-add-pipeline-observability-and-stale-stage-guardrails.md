# Story 131: Add pipeline observability and stale-stage guardrails

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Add stage-level operational visibility and stale-job protection.

## Why This Matters
- Improves incident triage speed.
- Prevents deadlocks from permanently queued/running stages.

## Scope
- Emit and persist stage metrics:
  - queue lag
  - stage duration
  - success/failure counts
- Add stale queued/running timeout policies with explicit failure codes.
- Extend operations UI labels/messages for stage model.

## Acceptance Criteria
- Stale stage records auto-resolve with clear reason.
- Operations UI/API exposes enough data to diagnose bottlenecks.

## Deliverables
- Observability fields/queries.
- Guardrail policy implementation and status messaging.
