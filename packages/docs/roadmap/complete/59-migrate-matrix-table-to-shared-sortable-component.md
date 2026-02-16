# Story 59: Migrate Matrix Table to Shared Sortable Component

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Refactor matrix insight table sorting to use the shared sortable table primitives.

## Why This Matters
- Keeps matrix table behavior aligned with the global sorting UX standard.
- Removes page-specific sorting boilerplate.

## Scope
- Replace local sort state/toggle/sort indicator in matrix table.
- Use shared `useSortableColumns` and `SortableTableHead` for all sortable matrix columns.
- Preserve existing matrix table pagination and sorting semantics.

## Acceptance Criteria
- Matrix table still sorts by all previously sortable columns.
- Sort direction toggle behavior remains unchanged for users.
- No regression in matrix page rendering/type checks.

## Deliverables
- Updated `apps/web/app/(protected)/analytics/[analyticsId]/matrix/matrix-insight-table.tsx`
