# Story ME-06: Type-Safety Hardening

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Make touched package code fully type-safe with strict typing boundaries.

## Why This Matters
- Catches schema and integration issues earlier.
- Reduces runtime surprises in shared package code.

## Scope
- Tighten annotations in `core`, `features`, and adapters.
- Remove unsafe typing patterns (`Any` where avoidable, implicit unions, etc.).
- Ensure type checks pass without introducing type-ignore debt.

## Acceptance Criteria
- Type checks pass for package scope.
- Key APIs expose clear typed signatures.
- Unit tests remain green with stricter typing.

## Deliverables
- Typing cleanup patch set.
- Type-check command evidence.
- Brief notes on intentionally retained dynamic typing (if any).

## Implementation Notes
- Tightened contract/model typing by replacing broad `Any` fields in analytics summary payloads with explicit typed rows:
  - `packages/menuyukti/src/menuyukti/core/contracts/v1.py`
  - `packages/menuyukti/src/menuyukti/core/models/sales_analytics_summary.py`
- Hardened adapter boundaries to typed mapping inputs and Pydantic `model_validate(...)` parsing:
  - `packages/menuyukti/src/menuyukti/core/contracts/adapters.py`
- Improved analytics function signatures and typed payload rows for heatmap/popularity/menu extraction outputs:
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_menu_heatmaps.py`
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_popularity_index.py`
  - `packages/menuyukti/src/menuyukti/core/analytics/extract_menu_items.py`
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_sales_analytics.py`
  - `packages/menuyukti/src/menuyukti/core/analytics/calculate_menu_engineering_matrix.py`
- Added package-level mypy configuration and dev type-check dependency group:
  - `packages/menuyukti/pyproject.toml`

## Test Evidence
- Type check:
  - `uv run --project . --group dev mypy src/menuyukti`
  - Result: `Success: no issues found in 24 source files`
- Unit/contract regression:
  - `uv run --project . --group dev pytest tests/unit tests/analytics/unit tests/analytics/contract`
  - Result: `44 passed`

## Retained Dynamic Typing Notes
- Adapter entry points still accept generic JSON-like mappings (`Mapping[str, object]`) at boundaries to preserve compatibility with existing callers and legacy payload shapes.
- Dynamic parsing is contained by `model_validate(...)`, so internal model types remain strict after boundary validation.
