# Story AS-06: Scenario Simulation and What-If Evaluation

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
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

