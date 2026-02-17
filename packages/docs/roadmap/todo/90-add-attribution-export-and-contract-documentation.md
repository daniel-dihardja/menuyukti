# Story 90: Add attribution export and contract documentation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 86

## Goal
Provide stable attribution export output and a documented contract for analyst/operations reporting workflows.

## Why This Matters
- Teams need shareable weekly attribution reports outside the UI.
- Contracted export schema reduces downstream integration breakage.
- Keeps attribution workflow consistent with matrix/pairs/heatmap export standards.

## Scope
- Add attribution dataset support to export endpoint(s) or dedicated route.
- Define stable column schema, metadata fields, and filter parameters.
- Create/extend docs contract file in `packages/docs`.
- Ensure confidence/rationale fields are included in export where relevant.

## Acceptance Criteria
- Attribution CSV export is accessible from product workflow.
- Export schema is stable and documented in a contract markdown file.
- Export includes deterministic context fields (window, ids, confidence, quality/freshness references where available).
- Basic integration test validates non-empty export for seeded data.

## Deliverables
- Export route enhancement for attribution dataset.
- Contract markdown for attribution export shape.
- Tests for export success path and schema expectations.

## Dependencies
- Story 86
- Story 87
- Story 88

