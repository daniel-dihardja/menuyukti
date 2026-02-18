# Story AS-04: Menu Profit Intelligence Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Ship the analyst-facing profit intelligence agent that generates action boards with explainable impact.

## Why This Matters
- Delivers decision-grade analyst outputs with reduced manual analysis time.
- Improves consistency of weekly profitability and mix decisions.

## Scope
- Build analyst action board output with `promote/improve/bundle/deprioritize`.
- Use matrix, pair/combo, COGS readiness, and attribution context.
- Support exportable analyst decision package.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Analyst can generate weekly decision board for eligible analytics scope.
- Recommendations include evidence, confidence/readiness, and impact fields.
- E2E and export contract checks pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Profit intelligence agent route and orchestration.
- Analyst export alignment updates.
- Test coverage for analyst workflow.

## Implementation Notes
- Added agents app endpoint: `POST /agents/profit-intelligence/action-board`.
- Added web API orchestration endpoint: `GET /api/agents/profit-intelligence`.
- Added `menu-profit-intelligence` agent in Agent Studio with dedicated runner UI.
- Integrated matrix + COGS readiness + combo context + attribution context into candidate generation.
- Added decision package export links (`matrix`, `pairs`, `combos`, `attribution`) in response payload.
- Persisted outputs into `agent_outputs` (`agent_id=menu-profit-intelligence`).

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:profit-intelligence`
