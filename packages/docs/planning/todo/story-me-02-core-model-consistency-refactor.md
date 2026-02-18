# Story ME-02: Core Model Consistency Refactor

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
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

