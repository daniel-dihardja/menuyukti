# Story 60: Migrate Pairs/Combos Tables to Shared Sortable Component

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Refactor pair and combo insight table sorting to consume the shared sortable table primitives.

## Why This Matters
- Ensures one consistent sortable-header UX across matrix and pair/combo insights.
- Simplifies maintenance by centralizing sorting UI behavior.

## Scope
- Replace local pair/combo sort state and header indicators with shared primitives.
- Use `SortableTableHead` for sortable columns in both pair and combo tables.
- Keep existing table data calculations and explainability behavior unchanged.

## Acceptance Criteria
- Pair and combo tables still sort correctly by each sortable column.
- Header indicators and toggle behavior are consistent with matrix table.
- No regression in page rendering/type checks.

## Deliverables
- Updated `apps/web/app/(protected)/analytics/[analyticsId]/pairs/pairs-insight-panels.tsx`
