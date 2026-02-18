# Story AS-09: Learning Data Model and Outcome Signal Capture

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Create the data model and event capture layer required for controlled outcome-based learning.

## Why This Matters
- Learning quality depends on clean recommendation-to-outcome linkage.
- Enables measurable self-improvement without unsafe shortcuts.

## Scope
- Define events for issued recommendation, user decision, execution status, and outcome deltas.
- Enforce branch/persona/time scoping and schema versioning.
- Add data quality checks for learning eligibility.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Learning events are persisted with deterministic linkage keys.
- Weak or noisy outcomes are filtered out by policy.
- Learning capture tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Learning event schema and storage design.
- Capture pipeline implementation.
- Validation checks for learning data quality.

## Implementation Notes
- Added agents app eligibility policy endpoint: `POST /agents/learning/eligibility`.
- Added learning event repository and deterministic linkage key design:
  - `apps/web/lib/agents/learning-repository.ts`
  - linkage key format: `loc:{locationId}:an:{analyticsId}:rec:{recommendationId}`
- Added learning event capture API:
  - `POST /api/agents/learning/events`
  - `GET /api/agents/learning/events`
- Implemented signal model coverage for:
  - `recommendation_issued`
  - `user_decision`
  - `execution_status`
  - `outcome_delta`
- Added policy filtering for weak/noisy outcomes:
  - low/blocked confidence rejection
  - minimum sample size guard
  - minimum absolute revenue delta guard
- Persisted learning events in versioned schema (`schemaVersion=v1`) with tenant/time scope.

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_learning_eligibility_agent.py apps/agents/tests/integration_tests/test_agent_guardrail_determinism.py apps/agents/tests/integration_tests/test_memory_context_agent.py apps/agents/tests/integration_tests/test_simulation_agent.py apps/agents/tests/integration_tests/test_consensus_agent.py apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:learning`
