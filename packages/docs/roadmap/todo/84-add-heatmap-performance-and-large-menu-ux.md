# Story 84: Add Heatmap Performance and Large-Menu UX

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Ensure heatmap remains responsive and usable for large menus and multi-week data slices.

## Why This Matters
- Heatmap rows can become too large for practical scanning and interaction.
- Performance regressions directly reduce decision speed and trust in the tool.

## Scope
- Optimize render path for larger row counts (virtualization/pagination where appropriate).
- Improve table usability:
  - sticky menu column
  - horizontal scroll affordance
  - density option (compact/comfortable)
- Add guardrails for expensive view states (hard limits + user feedback).

## Acceptance Criteria
- Large-menu heatmap interaction remains smooth within defined performance budget.
- Users can navigate wide matrices without losing row context.
- System degrades gracefully when requested view exceeds practical limits.

## Deliverables
- Heatmap performance/UX enhancements in table component(s).
- Performance assertions or benchmark checks for target dataset sizes.
