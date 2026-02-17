# Story 144: Add sales dropdown icons and separators

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 139

## Goal
Improve the `/analytics/sales` row action dropdown by adding icons and logical separators between action groups.

## Why This Matters
- Faster scanning for users who run this workflow repeatedly.
- Better visual grouping between decision actions and destructive actions.
- Improves clarity without changing behavior.

## Scope
- Add icons for each dropdown action (Matrix, COGS, Heatmap, Pairs, Scheduler, Attribution, Finance, Delete).
- Add separators for logical groupings:
  - decision flow actions
  - setup/dependency action (`COGS`)
  - destructive action (`Delete`)
- Preserve existing readiness badges, disabled states, order, and tooltips.

## Acceptance Criteria
- Dropdown includes consistent icons for all actions.
- Visual separators are present and align with workflow grouping.
- No regression in readiness gating or navigation behavior.

## Deliverables
- Sales dropdown UI polish update with icons and separators.

## Dependencies
- Epic 139.
