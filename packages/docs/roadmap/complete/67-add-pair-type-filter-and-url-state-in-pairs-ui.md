# Story 67: Add Pair Type Filter and URL State in Pairs UI

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Enable users to filter pairs/combos by pair type directly in the GUI.

## Why This Matters
- Lets marketers focus on high-priority `food_drink` bundles instantly.
- Preserves shareable views for team collaboration.

## Scope
- Add pair-type filter control in pairs filter bar.
- Extend URL state parser/serializer for pair type.
- Apply filter to both pair and combo tables.

## Acceptance Criteria
- Users can filter by `all`, `food_drink`, `food_food`, `drink_drink`, `unknown`.
- Filter state is preserved in URL and reload-safe.

## Deliverables
- Updated filter bar + filter-state utilities + page filtering.

