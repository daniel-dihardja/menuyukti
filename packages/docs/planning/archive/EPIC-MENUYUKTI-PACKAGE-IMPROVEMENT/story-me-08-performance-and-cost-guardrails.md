# Story ME-08: Performance and Cost Guardrails

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Introduce lightweight performance baselines and guardrails for core compute paths.

## Why This Matters
- Prevents hidden regressions in hot paths.
- Keeps compute/resource costs predictable as features evolve.

## Scope
- Identify key compute-heavy paths (analytics transforms, feature derivation).
- Capture baseline timings for representative datasets.
- Add simple regression guardrails in tests or scripts.

## Acceptance Criteria
- Baseline performance metrics are recorded.
- Guardrails can detect clear regressions.
- No major regression introduced by prior refactors.

## Deliverables
- Performance baseline report/artifact.
- Guardrail checks (test/script) and usage notes.
- Follow-up hotspot list (if optimization deferred).

## Implementation Notes
- Added performance guardrail runner:
  - `packages/menuyukti/scripts/perf_guardrails.py`
  - Modes:
    - `--mode report`: write/update baseline artifact
    - `--mode check`: compare current runtime against baseline ratio thresholds
- Added baseline artifact:
  - `packages/menuyukti/perf/baseline_v1.json`
  - Tracks median timings, row volume, iteration count, and allowed regression ratio per case.
- Added unit tests for regression decision logic:
  - `packages/menuyukti/tests/unit/test_perf_guardrails.py`
- Added usage notes to package README:
  - `packages/menuyukti/README.md`

## Baseline Snapshot
- `calculate_sales_analytics`:
  - median `12.706ms` on `10,000` rows
- `calculate_menu_engineering_matrix`:
  - median `328.294ms` on `20,000` rows

## Follow-Up Hotspots
- `calculate_menu_engineering_matrix` is currently the main hotspot and has significantly higher median runtime than `calculate_sales_analytics`.
- Potential next optimization areas (deferred):
  - reduce repeated dataframe allocations/copies in matrix pipeline
  - evaluate vectorized alternatives to row-iterative output materialization
  - split threshold/distribution computations into cheaper intermediate projections when dataset grows

## Test Evidence
- Baseline generation:
  - `uv run --project . --group dev python scripts/perf_guardrails.py --mode report`
- Guardrail check:
  - `uv run --project . --group dev python scripts/perf_guardrails.py --mode check`
  - Result: both benchmark cases passed guardrail limits.
- Full package regression:
  - `uv run --project . --group dev pytest tests`
  - Result: `55 passed`
