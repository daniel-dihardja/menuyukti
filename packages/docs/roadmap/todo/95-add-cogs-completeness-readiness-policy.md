# Story 95: Add COGS completeness readiness policy

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 92

## Goal
Apply deterministic readiness/confidence behavior when COGS completeness falls below configured thresholds.

## Why This Matters
- Prevents over-confident profitability decisions with weak cost coverage.
- Aligns analyst trust behavior with existing freshness/quality guardrails.

## Scope
- Define coverage thresholds and downgrade/block behavior.
- Surface policy state in analyst decision contexts.
- Keep policy deterministic and explainable.

## Acceptance Criteria
- Low COGS coverage triggers downgrade/block status per policy.
- UI/API expose policy reasons and resulting state.
- Tests cover threshold edges and downgrade transitions.

## Deliverables
- Policy logic implementation.
- UI/API integration for policy status and reasons.
- Unit/integration tests.

