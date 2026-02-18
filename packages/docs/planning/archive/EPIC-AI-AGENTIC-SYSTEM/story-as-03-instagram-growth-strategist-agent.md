# Story AS-03: Instagram Growth Strategist Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Ship the marketer-facing strategist agent that produces weekly Instagram plans with evidence and confidence/readiness.

## Why This Matters
- Delivers direct marketer value: faster, higher-quality campaign planning.
- Converts analytics into executable weekly priorities.

## Scope
- Build strategist response contract: prioritized items, posting windows, rationale, confidence/readiness.
- Integrate with scheduler handoff flow and decision package export.
- Enforce guardrails for stale/low-quality contexts.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Marketer can generate and review a weekly plan from eligible analytics context.
- Output includes contract-compliant evidence and trust metadata.
- End-to-end strategist flow tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Strategist agent route and service logic.
- Scheduler handoff integration.
- E2E and contract test updates.

## Implementation Notes
- Added agents app strategist endpoint: `POST /agents/strategist/weekly-plan`.
- Added web API integration endpoint: `GET /api/agents/strategist`.
- Added strategist agent card and runner UI in Agent Studio (`/agents/marketer-strategist`).
- Persisted strategist output snapshots into `agent_outputs` (`agent_id=marketer-strategist`).

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_tool_contract_policy.py apps/agents/tests/integration_tests/test_api.py`
- Story E2E test:
  - `pnpm -C apps/web run test:e2e:agents:strategist`
