# Story 73: Build Instagram Weekly Scheduler UX

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`

## Goal
Ship a marketer-facing weekly calendar workflow that turns recommendation outputs into a practical posting plan.

## Why This Matters
- Marketers need a focused Instagram execution surface to convert insights into action.
- This closes the largest remaining marketer workflow gap in MVP value delivery.

## Scope
- Add protected route/page for weekly schedule planning by location and week.
- Provide "add from recommendation" flow using matrix/daypart signals.
- Support entry edits for posting slot, campaign/post identity linkage, and promoted item mapping.
- Add schedule status states (`draft`, `scheduled`, `published`, `cancelled`) and basic list/filter controls.
- Show quality/freshness trust signals in scheduler header and entry detail.

## Acceptance Criteria
- Marketer can generate an initial draft schedule from recommendation candidates.
- Marketer can edit, remove, and reorder planned entries within the selected week.
- Schedule view preserves and reloads saved plan state.
- Scheduler clearly communicates when data readiness downgrades confidence.

## Deliverables
- New weekly scheduler page + components.
- Navigation entry from analytics marketer workflow.
- URL state support for location/week context.
