# Story AST-13: Mocked-Input Integration Test Baseline per Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Establish golden mocked-input integration test sets for every Phase 1 agent.

## Why This Matters
- Guarantees isolated, deterministic validation of agent behavior.
- Removes dependency on live DB/analytics for core behavior checks.

## Scope
- Define baseline mocked scenarios per in-scope agent:
  - happy path
  - low-readiness
  - blocked/guardrail
  - provider failure
  - malformed context
- Integrate baseline into CI gating.

## Acceptance Criteria
- Every Phase 1 agent has complete mocked scenario coverage.
- Scenario coverage is mandatory CI gate before web integration.
- Integration tests assert schema compliance, trust fields, fallback behavior.
- Story-specific E2E validates that agent pages behave correctly when these states occur.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Golden mocked scenario fixtures per agent.
- Agents integration test suites per agent.
- CI policy updates for mandatory mocked baseline.
- Story E2E suite and evidence.
