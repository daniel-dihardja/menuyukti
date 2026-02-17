# Story 145: Add tooltips for pairs top KPI cards

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: null

## Goal
Add help tooltips to the top KPI cards on `/analytics/{analyticsId}/pairs` for:
- Top Lift Pair
- Highest Volume Pair
- Best Combo Opportunity

## Why This Matters
- These KPI labels are high-value but can be ambiguous without metric definitions.
- Tooltips improve analyst trust and reduce misinterpretation of pair/combo signals.

## Scope
- Add tooltip triggers in the KPI card header/label area.
- Add concise metric explanations for each KPI.
- Keep current KPI values and layout behavior unchanged.

## Acceptance Criteria
- Each of the 3 KPI cards has a visible tooltip affordance.
- Tooltip copy clearly explains what the KPI means and how to interpret it.
- No regression in pairs page rendering and KPI calculations.

## Deliverables
- KPI tooltip UI updates on pairs page.

## Dependencies
- None.
