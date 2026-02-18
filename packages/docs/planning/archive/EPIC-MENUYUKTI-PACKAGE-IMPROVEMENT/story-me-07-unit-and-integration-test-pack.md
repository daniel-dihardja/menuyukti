# Story ME-07: Unit and Integration Test Pack

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Add sufficient test coverage for changed logic and cross-module behavior.

## Why This Matters
- Protects refactors from regressions.
- Ensures deterministic behavior in realistic scenarios.

## Scope
- Add unit tests for modified models, validation, ranking, and feature logic.
- Add integration tests for representative marketer/analyst scenarios.
- Include edge/degraded input cases.

## Acceptance Criteria
- New/updated logic paths are covered by unit tests.
- Integration tests verify contract-safe outputs end-to-end.
- Test suite documents expected deterministic behavior.

## Deliverables
- Expanded unit test suite.
- Integration test scenarios and fixtures.
- Test evidence commands/results in story notes.

## Implementation Notes
- Added an end-to-end integration scenario that validates cross-module compatibility from analytics outputs, through contract envelopes/adapters, into canonical `CoreInputs`:
  - `packages/menuyukti/tests/analytics/integration/test_end_to_end_core_inputs_flow.py`
- Expanded degraded/edge behavior coverage:
  - `packages/menuyukti/tests/analytics/integration/test_sales_analytics.py`
  - `packages/menuyukti/tests/analytics/unit/test_menu_engineering_matrix.py`
  - `packages/menuyukti/tests/unit/test_contract_adapters.py`
- Deterministic behavior is explicitly asserted in the new integration flow by checking normalized sorted output order for matrix items and heatmaps.

## Test Evidence
- Full package suite:
  - `uv run --project . --group dev pytest tests`
  - Result: `53 passed`
