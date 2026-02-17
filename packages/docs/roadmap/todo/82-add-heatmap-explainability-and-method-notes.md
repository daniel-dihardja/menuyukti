# Story 82: Add Heatmap Explainability and Method Notes

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Provide explainability for heatmap values and derived suggestions so users understand "why this time window."

## Why This Matters
- Adoption increases when users trust how insights are generated.
- Without method context, heatmaps can be misread as absolute outcomes instead of sampled behavior signals.

## Scope
- Add inline explainability panel/drawer with:
  - how daily/weekly buckets are built
  - how peak windows are ranked
  - confidence caveats for low sample or sparse data
- Add field/tooltips for core terms (`peak`, `low window`, `daypart bias`, etc.).
- Add deterministic note about expected action interpretation for marketer vs analyst.

## Acceptance Criteria
- Users can open explainability content directly from heatmap page.
- Explainability text maps to deterministic calculation logic.
- Help content is concise, accessible, and non-ambiguous.

## Deliverables
- Explainability UI entry points and content block(s).
- Tooltip/help text additions for core heatmap concepts.
