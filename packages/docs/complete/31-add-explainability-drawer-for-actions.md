# Story 31: Add Explainability Drawer for Actions

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Add explainability for recommendation actions so users understand and trust each suggestion.

## Why This Matters
- Marketers need confidence before changing promotions.
- Menu analysts need transparent criteria for validation.

## Scope
- Add per-row explainability UI (drawer/popover).
- Show metric-driven rationale in plain business language.
- Tie rationale to margin/popularity thresholds.

## Data Engineering Requirements
- Explainability text must reference real row values.
- No action recommendation without available supporting metrics.
- Threshold source and version are traceable.

## Acceptance Criteria
- Every action has a visible, understandable rationale.
- Explanations are consistent with computed category/action.
- Interaction works across desktop and mobile.

## Deliverables
- Action explainability UI component.
- Mapping logic from metrics to reasons.
