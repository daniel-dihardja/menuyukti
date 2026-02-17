# Story 81: Add Heatmap Trust and Confidence Signals

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Surface data freshness/quality and confidence messaging on heatmap page, aligned with platform trust policy.

## Why This Matters
- Heatmap is a decision surface and should not hide trust/readiness state.
- Users need explicit warnings when recommendations are stale or quality is degraded.

## Scope
- Show run metadata on heatmap page:
  - quality status
  - freshness age vs SLA
  - stale/warn/failed state
- Add confidence downgrade messaging for heatmap-derived actions.
- Ensure blocked/degraded policy copy is consistent with matrix/pairs/scheduler conventions.

## Acceptance Criteria
- Trust metadata is visible without leaving the heatmap page.
- Degraded or stale data clearly changes confidence messaging.
- No high-confidence action copy is shown when trust policy is degraded/blocked.

## Deliverables
- Heatmap trust badge and messaging components.
- Shared policy-aligned helper usage and/or adapter integration.
