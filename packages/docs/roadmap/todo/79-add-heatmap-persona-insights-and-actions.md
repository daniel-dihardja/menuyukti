# Story 79: Add Heatmap Persona Insights and Actions

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Add persona-specific insight cards and action cues on heatmap page for marketers and analysts.

## Why This Matters
- Heatmap intensity alone does not explicitly answer "what should I do next?"
- Marketers need clear posting-window and campaign timing cues.
- Analysts need high/low-demand opportunity and risk signals by daypart.

## Scope
- Add marketer insight cards:
  - peak posting windows
  - weak windows to avoid
  - candidate menu focus by daypart
- Add analyst insight cards:
  - underperforming windows with optimization opportunity
  - demand concentration risk by menu/daypart
  - weekday/weekend demand bias summary
- Add concise recommended next actions beneath insights.

## Acceptance Criteria
- Heatmap page presents explicit marketer and analyst guidance above raw matrix.
- Insights are deterministic and reproducible from existing analytics data.
- Users can explain each insight back to its source metric/time bucket.

## Deliverables
- Heatmap page UI updates with insight/action sections.
- Deterministic insight derivation helper(s) with test coverage.
