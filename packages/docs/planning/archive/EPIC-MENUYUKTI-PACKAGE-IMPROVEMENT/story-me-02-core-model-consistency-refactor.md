# Story ME-02: Core Model Consistency Refactor

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Align core model fields, typing, and invariants across matrix-related objects.

## Why This Matters
- Eliminates schema drift between `matrix_item` and `matrix_distribution`.
- Improves reliability of transformations and contract adapters.

## Scope
- Refactor core model definitions for consistent naming/types.
- Remove ambiguous fields or duplicate semantics.
- Enforce invariants at model boundaries.

## Acceptance Criteria
- Model structures are internally consistent and deterministic.
- Existing consumers compile/run with updated model shape.
- Unit tests validate invariants and serialization behavior.

## Deliverables
- Updated model files and adapters.
- Migration notes for changed fields (if any).
- Unit tests for model consistency and invariants.

## Implementation Notes
- Updated `MatrixItem` model consistency and boundaries:
  - `packages/menuyukti/src/menuyukti/core/models/matrix_item.py`
  - added `extra="forbid"` and frozen model config
  - enforced non-empty identity fields with whitespace normalization
  - added explicit `CORE_MODEL_EMPTY_STRING` validation guard
- Updated `MatrixDistribution` consistency and invariants:
  - `packages/menuyukti/src/menuyukti/core/models/matrix_distribution.py`
  - aligned category typing to shared `MatrixCategory`
  - added `extra="forbid"` and frozen model config
  - enforced non-empty categories list
  - added duplicate-category invariant with error code:
    `CORE_MODEL_DUPLICATE_CATEGORY_DISTRIBUTION`
  - added deterministic category sorting for stable serialization
- Added dedicated unit coverage for core model invariants:
  - `packages/menuyukti/tests/unit/test_core_models_consistency.py`
- Updated existing tests to match tightened model boundaries:
  - `packages/menuyukti/tests/unit/test_core_inputs.py`

## Test Evidence
- Full package test suite passed:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests`
  - Result: `44 passed`
