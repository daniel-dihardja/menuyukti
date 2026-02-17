# Story 159: Generate Weekly Suggestions From Heatmap Signals

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Generate weekly Instagram post suggestions directly from sales heatmap outputs.

## Why This Matters
- This is the core marketer value: data-driven weekly posting guidance.

## Scope
- Build suggestion scoring/ranking from heatmap demand and profitability signals.
- Output suggestion rationale, suggested day/time window, menu focus, and offer type.
- Add API endpoint to retrieve weekly suggestions by analytics id and week.

## Acceptance Criteria
- API returns non-empty suggestions for seeded heatmap-enabled analytics.
- Each suggestion includes rationale text traceable to heatmap metrics.
- Ranking is deterministic for identical input data.
- Soft-fallback behavior exists when optional sources are missing.

## Deliverables
- Suggestion generator service.
- Weekly suggestion API route and response contract.
- Unit tests for ranking logic and fallback behavior.
