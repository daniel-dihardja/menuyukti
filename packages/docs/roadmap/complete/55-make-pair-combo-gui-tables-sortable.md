# Story 55: Make Pair/Combo GUI Tables Sortable

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Allow users to sort pair and combo tables directly in the GUI by clicking table columns.

## Why This Matters
- Analysts need fast interactive ranking without constantly changing filter dropdown state.

## Scope
- Add clickable sortable headers for relevant numeric columns.
- Add visible sort direction indicator.
- Keep stable deterministic fallback ordering.

## Acceptance Criteria
- Clicking a header toggles asc/desc sort.
- Sort applies immediately to visible table rows.
- No regression in explainability sheet behavior.

## Deliverables
- Sortable pair table + sortable combo table in GUI.
