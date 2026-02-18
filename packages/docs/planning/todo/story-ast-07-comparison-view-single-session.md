# Story AST-07: Comparison View (Single Session)

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Enable users to compare two runs of the same agent in one session.

## Why This Matters
- Makes prompt/context tuning outcomes visible.
- Helps users understand impact of changed assumptions.

## Scope
- Add run selection for A/B comparison.
- Show differences in recommendation, confidence, readiness, and evidence.
- Highlight fallback/guardrail differences.

## Acceptance Criteria
- Users can select two runs and view a structured diff.
- Diff includes trust metadata changes and key output field changes.
- Agents app integration tests validate deterministic diff inputs using mocked runs.
- Story-specific E2E validates compare flow and diff rendering.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Comparison view UI + diff model.
- Run-diff adapter for Phase 1 agent outputs.
- Integration tests for diff semantics.
- Story E2E suite and evidence.
