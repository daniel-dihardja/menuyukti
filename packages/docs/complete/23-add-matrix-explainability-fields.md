# Story 23: Add Matrix Explainability Fields

## Goal
Make matrix categories explainable for menu analysts.

## Scope
- Persist classification inputs per menu item:
  - popularity_score
  - margin_score
  - thresholds used
- Add `reason_code` for assigned category.

## Acceptance Criteria
- Each matrix item has machine-readable explanation fields.
- Analysts can trace why an item is `star`, `puzzle`, `plow_horse`, or `low_end`.
- Explainability fields are versioned with schema contract.

## Deliverables
- Matrix schema extension.
- Classification explanation logic.

## Status
`complete`
