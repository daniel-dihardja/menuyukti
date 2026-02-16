# Story 64: Extend Combo Opportunity Mart with Pair Type

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Expose `pair_type` in combo opportunity mart for downstream ranking and UX.

## Why This Matters
- Ensures the combo ranking model can reason over food+drink relevance.
- Keeps API and exports aligned with warehouse truth.

## Scope
- Add `pair_type` projection to combo opportunity view.
- Ensure pair type is derived from canonical pair metrics logic.

## Acceptance Criteria
- Combo opportunity view includes `pair_type`.
- No regression to current combo metric fields.

## Deliverables
- Migration updating combo opportunity mart/view.

