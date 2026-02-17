# Story 93: Add COGS completeness KPIs and priority watchlist

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 92

## Goal
Expose analyst-facing COGS completeness KPI cards and a prioritized missing/invalid COGS watchlist in the COGS workflow.

## Why This Matters
- Analysts need immediate visibility into cost data quality before trusting margin outcomes.
- Prioritization by revenue/volume reduces operational noise.

## Scope
- Add KPI cards:
  - total menu items
  - items with valid COGS
  - item completeness %
  - revenue coverage %
- Add watchlist of missing/invalid COGS items sorted by business impact.
- Keep rendering lightweight and deterministic.

## Acceptance Criteria
- COGS page shows completeness KPI values from current analytics snapshot.
- Watchlist shows top missing/invalid COGS items ranked by impact.
- Values update after COGS save/import flows.

## Deliverables
- UI updates in COGS page/form.
- Deterministic summary helper and unit tests.

