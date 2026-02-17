# Story 139: Improve sales dropdown readiness and flow epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Make `/analytics/sales` action dropdown reflect true data readiness and recommended workflow order.

## Why This Matters
- Current action list mixes core-input-derived outputs with dependency-heavy features.
- Users can open screens that are not ready yet, which creates confusion and low-trust UX.

## Scope
- Add readiness model for dropdown actions.
- Add dependency-aware labels/badges/disabled states.
- Reorder actions by recommended decision flow.

## Acceptance Criteria
- Users can see which actions are ready vs blocked and why.
- Dropdown order reflects practical workflow from upload to downstream decisions.
- No core workflow regression in existing analytics routes.

## Deliverables
- Parent epic tracking stories 140-143.
