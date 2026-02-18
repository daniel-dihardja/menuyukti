# Story ME-00: Dead Code Audit and Removal

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Identify and remove unused, unreachable, or duplicate code paths in `packages/menuyukti`.

## Why This Matters
- Reduces maintenance cost and refactor risk.
- Makes type-safety and testing work faster and cleaner.

## Scope
- Audit `core`, `features`, and package-level exports.
- Remove dead modules/functions/imports and stale fixtures.
- Keep backward-compatible public entry points (or document breakage explicitly).

## Acceptance Criteria
- Dead code candidates are either removed or explicitly justified in comments/docs.
- No consumer import path is broken unintentionally.
- Unit/integration tests still pass for touched areas.

## Deliverables
- Dead code removal patch set.
- Short audit summary in story notes.
- Updated tests where behavior changed.

## Audit Summary
- Removed dead/broken unit test:
  - `packages/menuyukti/tests/unit/test_shared_primitives.py`
  - Reason: referenced non-existent module `menuyukti.shared.primitives`, no runtime path uses it.
- Removed stale fixtures not referenced by any tests:
  - `packages/menuyukti/tests/fixtures/menuyukti/expected_candidates.json`
  - `packages/menuyukti/tests/fixtures/menuyukti/expected_schedule.json`

## Validation
- Full package test suite passed after cleanup:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests`
  - Result: `40 passed`
