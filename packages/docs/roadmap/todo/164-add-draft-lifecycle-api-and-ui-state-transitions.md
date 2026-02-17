# Story 164: Add Draft Lifecycle API and UI State Transitions

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Implement save, approve, and publish-state transitions end-to-end.

## Why This Matters
- Marketers need a clear workflow from draft creation to execution readiness.

## Scope
- Add APIs for save draft, approve draft, and mark published.
- Reflect lifecycle status badges on scheduler slots.
- Persist transition timestamps and actor context where available.

## Acceptance Criteria
- Draft can transition `draft -> approved -> published` via API/UI actions.
- Invalid transitions are blocked with explicit error codes.
- Scheduler status badges update correctly after actions.
- Integration tests cover transition rules.

## Deliverables
- Lifecycle API handlers and service logic.
- Scheduler UI status transition wiring.
- Transition test suite.
