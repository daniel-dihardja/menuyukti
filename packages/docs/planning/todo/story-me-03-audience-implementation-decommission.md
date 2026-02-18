# Story ME-03: Audience Implementation Decommission

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
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
