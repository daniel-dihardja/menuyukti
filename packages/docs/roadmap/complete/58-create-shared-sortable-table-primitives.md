# Story 58: Create Shared Sortable Table Primitives

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Create reusable sortable table primitives so sortable header behavior is consistent across analytics pages.

## Why This Matters
- Avoids duplicate sorting logic and header styling.
- Reduces regression risk when improving sorting UX.

## Scope
- Add shared `useSortableColumns` hook for sort key + direction state.
- Add shared `SortableTableHead` component with indicator and keyboard accessibility.
- Keep implementation compatible with existing shadcn table primitives.

## Acceptance Criteria
- Shared sortable primitives compile and are importable from web components.
- Sortable header supports click and keyboard (`Enter`/`Space`) toggling.
- Active sort direction is visibly indicated.

## Deliverables
- `apps/web/components/sortable-table.tsx`
