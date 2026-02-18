# Story ME-03: Audience Implementation Decommission

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Remove leftover audience-specific implementation from `packages/menuyukti` now that the audience agent is retired.

## Why This Matters
- Removes dead paths and reduces cognitive load in core package maintenance.
- Prevents future confusion between active agent capabilities and legacy implementation leftovers.

## Scope
- Audit all audience-specific code paths (features, tests, docs, registry wiring).
- Remove or de-scope unused audience implementation.
- Keep package contracts and active consumers stable after cleanup.
- Update naming/docs where "audience" wording implies an active agent.

## Acceptance Criteria
- No active runtime path depends on removed audience-only implementation.
- All tests pass after cleanup and consumer imports remain valid.
- Docs no longer present audience implementation as an active agent capability.

## Deliverables
- Audience decommission patch set.
- Updated tests and fixtures (remove or replace audience-only coverage).
- Documentation updates reflecting decommission decision.

## Implementation Notes
- Removed retired audience implementation files:
  - `packages/menuyukti/src/menuyukti/features/audience.py`
  - `packages/menuyukti/src/menuyukti/features/__init__.py`
- Removed audience-only unit tests:
  - `packages/menuyukti/tests/unit/test_audience_features.py`
- Updated package docs to remove audience feature/provider instructions and examples:
  - `packages/menuyukti/README.md`
  - `packages/menuyukti/src/menuyukti/README.md`
- Updated core wording that implied active audience usage:
  - `packages/menuyukti/src/menuyukti/core/inputs.py`
  - `packages/menuyukti/src/menuyukti/core/models/sales_analytics_summary.py`
  - `packages/menuyukti/src/menuyukti/__init__.py`
  - `packages/menuyukti/src/menuyukti/core/__init__.py`

## Validation
- Verified no active runtime references to `menuyukti.features` or audience-specific builders in app/package code.
- Package test suite passed after decommission:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests`
  - Result: `40 passed`
