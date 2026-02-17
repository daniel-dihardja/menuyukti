# Story 130: Update read paths to latest valid materialization

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Serve analytics pages from latest successful stage outputs, not latest attempted writes.

## Why This Matters
- Prevents degraded UX when in-flight or failed recomputes exist.
- Ensures deterministic read consistency for marketers and analysts.

## Scope
- Update read APIs/pages to resolve latest valid output by stage lineage.
- Add fallback behavior when current stage attempt fails.
- Surface freshness/quality metadata tied to selected materialization.

## Acceptance Criteria
- Failed recompute does not break existing valid matrix/attribution reads.
- UI explicitly indicates freshness/quality of chosen materialization.

## Deliverables
- Read-path resolver updates.
- Integration updates for affected pages/APIs.

## Dependencies
- Story 129: stage outputs and idempotent recompute semantics are stable.
