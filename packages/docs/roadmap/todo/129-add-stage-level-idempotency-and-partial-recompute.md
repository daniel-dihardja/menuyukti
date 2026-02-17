# Story 129: Add stage-level idempotency and partial recompute

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Implement deterministic idempotency keys per stage and recompute only affected downstream stages.

## Why This Matters
- Reduces unnecessary full reruns.
- Makes retries safe and predictable.

## Scope
- Define idempotency strategy:
  - upload stage: location + file hash
  - cogs stage: analytics + cogs version/hash
  - matrix stage: sales snapshot + cogs version
- Trigger downstream-only recompute when COGS changes.
- Keep duplicate requests deduped and observable.

## Acceptance Criteria
- Repeated same-input stage requests reuse existing stage/run records.
- COGS updates do not trigger full upload reprocessing.

## Deliverables
- Idempotency key utilities and storage integration.
- Dependency-trigger logic for partial recompute.

## Dependencies
- Story 128: shared stage runner/claim abstraction is in place.
