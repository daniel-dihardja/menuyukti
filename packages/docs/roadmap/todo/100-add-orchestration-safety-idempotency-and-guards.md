# Story 100: Add orchestration safety, idempotency, and guards

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 98

## Goal
Enforce operational safety rules so retry/replay/backfill actions are idempotent, non-destructive, and conflict-aware.

## Why This Matters
- Prevents duplicate reruns and inconsistent recovery outcomes.
- Protects data quality and platform stability under operational stress.

## Scope
- Add idempotency keys for operation requests.
- Add conflict detection (active run lock / duplicate operation suppression).
- Add guardrails for allowed time windows and maximum backfill scope.
- Add deterministic error codes for blocked operations.

## Acceptance Criteria
- Duplicate requests with same idempotency key do not create duplicate operations.
- Conflicting operations are rejected with explicit machine-readable reasons.
- Guardrail limits are enforced and test-covered.

## Deliverables
- Safety/idempotency middleware or domain logic.
- Error code catalog for operation guardrail responses.
- Tests for idempotency and conflict scenarios.

