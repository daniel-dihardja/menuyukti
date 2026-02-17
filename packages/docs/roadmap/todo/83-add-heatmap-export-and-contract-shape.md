# Story 83: Add Heatmap Export and Contract Shape

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Add analyst-friendly heatmap export and define a stable contract for downstream reporting and review.

## Why This Matters
- Analysts need reusable extracts for weekly planning and cross-functional sharing.
- A stable contract prevents breakage in BI/reporting workflows.

## Scope
- Add CSV export endpoint/option for heatmap view (respecting applied filters).
- Include metadata envelope in export:
  - analytics/location identifiers
  - date range
  - trust/readiness context
- Define and document heatmap export field contract.

## Acceptance Criteria
- Export works for filtered and unfiltered heatmap views.
- Columns are stable and suitable for recurring weekly review sheets.
- Contract is documented and version-aware.

## Deliverables
- Heatmap export API and UI action(s).
- Contract documentation/update for heatmap export shape.
