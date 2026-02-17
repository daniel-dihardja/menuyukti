# Story 89: Link scheduler entries to attribution outcomes

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 86

## Goal
Connect weekly scheduler planning records with attribution outcomes so teams can close the loop between plan and performance.

## Why This Matters
- Turns scheduler from planning-only into measurable execution workflow.
- Helps marketers iterate weekly using real outcome evidence.
- Gives analysts a direct trace from planned entry to measured effect.

## Scope
- Add linkage between scheduler entries and campaign/post attribution context.
- Show quick outcome summary for scheduled/published rows where data exists.
- Support drill-through from scheduler to attribution overview.
- Preserve existing readiness guardrails and non-breaking behavior.

## Acceptance Criteria
- Scheduler rows with linked campaign/post can surface attribution status/outcome summary.
- User can navigate from scheduler context to detailed attribution view.
- Missing attribution data does not break scheduler flow; displays neutral state.
- Existing scheduler save/finalize behavior remains intact.

## Deliverables
- Scheduler UI updates for attribution linkage/status.
- Query/model integration for linked outcome data.
- Regression tests for scheduler save/finalize plus attribution status rendering.

## Dependencies
- Story 86
- Story 87
- Story 88

