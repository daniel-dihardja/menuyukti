# Story ME-04: Deterministic Ranking and Tie-Break Rules

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Define explicit, deterministic ranking and tie-break hierarchy in scoring paths.

## Why This Matters
- Prevents output churn between runs with equivalent scores.
- Improves reproducibility for QA and release validation.

## Scope
- Identify all ranking/sorting steps in package.
- Implement explicit tie-break keys with stable ordering.
- Ensure deterministic output for equal-score candidates.

## Acceptance Criteria
- Ranking results are reproducible across repeated runs.
- Tie cases follow documented deterministic rules.
- Unit tests cover same-score and near-score scenarios.

## Deliverables
- Ranking logic updates with deterministic tie-break rules.
- Unit tests for deterministic ordering.
- Documentation comments on ranking precedence.

## Implementation Notes
- Added deterministic ranking + tie-break rules in analytics paths:
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_popularity_index.py`
    - sort by `qty DESC`, tie-break by `menu ASC` (stable `mergesort`)
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_menu_heatmaps.py`
    - sort by total demand DESC, tie-break by `menu ASC`
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_menu_engineering_matrix.py`
    - items sort: `quantity DESC`, `total_revenue DESC`, `menu ASC`
    - distribution sort: `margin_share DESC`, `item_share DESC`, `category ASC`
- Added tie-case unit tests:
  - `packages/menuyukti/tests/analytics/unit/test_popularity_index.py`
  - `packages/menuyukti/tests/analytics/unit/test_menu_heatmaps.py`
  - `packages/menuyukti/tests/analytics/unit/test_menu_engineering_matrix.py`

## Test Evidence
- Targeted ranking/unit + contract coverage:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests/analytics/unit/test_popularity_index.py packages/menuyukti/tests/analytics/unit/test_menu_heatmaps.py packages/menuyukti/tests/analytics/unit/test_menu_engineering_matrix.py packages/menuyukti/tests/analytics/contract/test_output_contracts_v1.py`
- Full package regression run:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests`
  - Result: `43 passed`
