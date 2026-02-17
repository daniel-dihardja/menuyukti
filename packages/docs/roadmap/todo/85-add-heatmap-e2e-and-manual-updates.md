# Story 85: Add Heatmap E2E and Manual Updates

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Protect improved heatmap workflows with release-grade tests and updated user documentation.

## Why This Matters
- Heatmap improvements must be regression-safe before release.
- Manual guidance must reflect new persona-focused and trust-aware behavior.

## Scope
- Add/extend E2E coverage for:
  - persona insights visibility
  - filter/URL-state behavior
  - trust/readiness messaging
  - export action validity (if Story 83 is implemented)
- Update manual and index entries to include improved heatmap workflows.

## Acceptance Criteria
- Heatmap E2E flows pass deterministically with failure artifacts.
- Manual reflects the shipped behavior and terminology.
- Release gate includes heatmap-improvement coverage where required.

## Deliverables
- Heatmap E2E scripts and wiring updates.
- Manual markdown updates and index refresh.
