# Story 101: Add operations workflow UI and status tracking

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 98

## Goal
Provide an operator-facing workflow to trigger retry/replay/backfill actions and monitor execution status.

## Why This Matters
- Makes recovery actions discoverable and controlled in-product.
- Reduces reliance on internal-only scripts for day-to-day operations.

## Scope
- Add operations panel/page with action controls.
- Display operation status timeline (queued/running/succeeded/failed).
- Show operation context (location, range, source run, requested at/by).
- Include clear guardrail messaging for blocked actions.

## Acceptance Criteria
- Operator can submit valid retry/replay/backfill requests from UI.
- UI shows real-time or poll-based status updates.
- Failures expose actionable error details without leaking internals.

## Deliverables
- UI page/components for operations workflow.
- API polling/state handling for operation status.
- UI tests for key action and status states.

