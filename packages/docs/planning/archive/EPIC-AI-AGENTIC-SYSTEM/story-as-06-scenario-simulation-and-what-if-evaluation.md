# Story AS-06: Scenario Simulation and What-If Evaluation

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Provide scenario-based simulation for comparing campaign/menu strategies before execution.

## Why This Matters
- Reduces costly live experimentation.
- Helps teams choose plans with clearer expected outcomes.

## Scope
- Define simulation input contract (cadence, item focus, bundle strategy, constraints).
- Return ranked scenarios with assumptions and confidence bands.
- Integrate with planner decision workflow as optional advanced step.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Users can compare at least two scenarios with explicit assumption sets.
- Output includes confidence ranges and recommendation rationale.
- Simulation contract tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- What-if simulation API/tool.
- Scenario result schema and ranking logic.
- Docs and tests for simulation behavior.

## Implementation Notes
- Added agents app endpoint: `POST /agents/simulation/what-if`.
- Added web orchestration endpoint: `GET /api/agents/simulation`.
- Simulation input contract includes cadence, focus, bundle, and constraint penalties.
- Output now returns ranked scenarios, explicit assumptions, confidence bands, and winner rationale.
- Added mode support (`conservative` / `aggressive`) to tune baseline/scenario behavior.
- Added `what-if-simulation` agent with dedicated Agent Studio runner.
- Persisted simulation outputs to `agent_outputs` (`agent_id=what-if-simulation`).

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_simulation_agent.py apps/agents/tests/integration_tests/test_consensus_agent.py apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:simulation`
