# Story 63: Extend Pair Metrics Mart with Pair Type

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Add `pair_type` to pair metrics mart outputs.

## Why This Matters
- Makes food+drink analysis first-class in the warehouse layer.
- Enables filtering and scoring without re-deriving classification in UI.

## Scope
- Update marts SQL to compute `pair_type` per pair row.
- Join required category dimensions safely.
- Keep existing metrics unchanged.

## Acceptance Criteria
- Pair metrics view returns `pair_type` for each row.
- Existing pair metrics outputs remain backward-compatible.

## Deliverables
- Migration updating pair metrics mart/view.

