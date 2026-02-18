# Story ME-01: Canonical Input Contract and Validation Layer

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Define a strict canonical input contract with predictable validation, defaults, and error semantics.

## Why This Matters
- Prevents malformed payloads from silently propagating.
- Creates stable boundaries for downstream features and agents.

## Scope
- Standardize `CoreInputs` validation behavior.
- Define required vs optional fields and default handling.
- Normalize error codes/messages for invalid input.

## Acceptance Criteria
- Invalid payloads fail with clear reason codes/messages.
- Valid payloads normalize consistently across repeated runs.
- Unit tests cover required validation branches and edge cases.

## Deliverables
- Input contract updates in `core/inputs` and related models.
- Unit tests for valid/invalid/default scenarios.
- Contract usage notes in package README (or linked doc).

## Implementation Notes
- Added strict canonical input behavior in:
  - `packages/menuyukti/src/menuyukti/core/inputs.py`
- Contract behavior added:
  - `extra="forbid"` and `frozen=True` model config
  - required non-empty `matrix_items` and `heatmaps`
  - explicit validation codes:
    - `CORE_INPUT_HEATMAP_MENU_UNKNOWN`
    - `CORE_INPUT_DISTRIBUTION_DUPLICATE_CATEGORY`
  - deterministic normalization of `matrix_items`, `heatmaps`, and `distribution.categories`
- Unit tests expanded in:
  - `packages/menuyukti/tests/unit/test_core_inputs.py`
  - added invalid/default/normalization branches and code-path assertions
- Contract usage notes documented in:
  - `packages/menuyukti/README.md`
  - `packages/menuyukti/src/menuyukti/README.md`

## Test Evidence
- `uv run --project packages/menuyukti pytest packages/menuyukti/tests/unit/test_core_inputs.py packages/menuyukti/tests/unit/test_audience_features.py`
