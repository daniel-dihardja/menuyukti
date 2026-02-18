# Story AST-13: Mocked-Input Integration Test Baseline per Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
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
- Integration tests assert stable structured envelope + typed domain payload shape in every scenario.
- Story-specific E2E validates that agent pages behave correctly when these states occur.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Golden mocked scenario fixtures per agent.
- Agents integration test suites per agent.
- CI policy updates for mandatory mocked baseline.
- Story E2E suite and evidence.

## Implementation Notes
- Added full per-agent mocked baseline integration suite with scenario matrix:
  - `apps/agents/tests/integration_tests/test_mocked_input_baseline_per_agent.py`
- Scenario coverage per Phase 1 agent:
  - happy path
  - low-readiness / low-signal
  - blocked guardrail
  - provider failure fallback
  - malformed context
- Assertions enforce:
  - structured envelope fields
  - run/llm metadata presence
  - typed domain payload path shape
  - fallback/blocked consistency signals
- Added mandatory gate target for CI-style execution:
  - `apps/agents/Makefile` target `mocked_baseline_tests`
- Updated agents docs with mandatory baseline gate command:
  - `apps/agents/README.md`
- Added story E2E for Agent Studio state behavior validation:
  - `apps/web/e2e/agent-mocked-baseline-states.e2e.ts`
  - wired in:
    - `apps/web/package.json`
    - `apps/web/scripts/run-e2e-shared-services.ts`
    - `apps/web/scripts/run-e2e-full.ts`
    - `apps/web/e2e/README.md`

## Test Evidence
- Agents integration baseline:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_mocked_input_baseline_per_agent.py`
- Regression check:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_llm_runtime_integration.py`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:mocked-baseline-states`

## Unit Test Notes
- N/A for this story.
- Scope is integration and E2E baseline coverage; no new isolated utility logic required additional unit tests.
