# Story 51: Create Pair/Combo GUI Route and Navigation

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Introduce a first-class analytics GUI page for pair/combo analysis so users do not rely on raw export links.

## Why This Matters
- Makes pair/combo insights discoverable and usable by non-technical users.

## Scope
- Add `/analytics/{analyticsId}/pairs` route.
- Add navigation entry from sales report actions and route helper.
- Add initial page shell with data trust context (quality/freshness).

## Acceptance Criteria
- User can open pairs page from sales actions.
- Page loads for valid analytics id and shows analytics context.
- No regressions on existing matrix/heatmap/finance actions.

## Deliverables
- Route helper + sales table action update.
- New pairs page shell.
