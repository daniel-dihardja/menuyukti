# Story 141: Update sales dropdown UI with badges, disabled states, and order

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 139

## Goal
Apply readiness model to sales dropdown UI with clear status indicators and workflow-based action order.

## Why This Matters
- Users need immediate visual guidance on what to do next.
- Prevents dead-end clicks to features that are not yet actionable.

## Scope
- Add readiness badges/tooltips next to actions.
- Disable actions when prerequisites are not met (with explanation).
- Reorder actions to recommended flow:
  - Matrix -> COGS -> Heatmap/Pairs -> Scheduler -> Attribution -> Finance.

## Acceptance Criteria
- Dropdown actions show readiness state and dependency reason.
- Disabled actions cannot be triggered.
- Order matches defined workflow and is consistent across rows.

## Deliverables
- Sales table dropdown UI update.

## Dependencies
- Story 140.
