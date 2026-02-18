# Story AS-08: Agent Guardrails, Evaluation Harness, and Release Gate

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Enforce trust guardrails and formal release gates for agent workflows.

## Why This Matters
- Prevents unsafe or low-trust recommendations from reaching users.
- Creates repeatable standards for agent release quality.

## Scope
- Enforce block/degrade policies by freshness/quality/readiness.
- Build evaluation harness for contract compliance and output quality.
- Define release-gate checks and failure artifact requirements.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Guardrail behavior is deterministic and machine-verifiable.
- Evaluation harness runs in CI with pass/fail thresholds.
- Agent release gate suite passes for required workflows.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Guardrail policy implementation updates.
- Agent eval harness and CI wiring.
- Release-gate documentation and evidence output.

## Implementation Notes
- Added deterministic blocked-readiness guardrail verification across agent workflows in agents integration tests.
- Added release-gate eval harness:
  - `apps/web/lib/agents/release-gate.ts`
  - `apps/web/app/api/agents/release-gate/route.ts`
- Release gate now evaluates:
  - required workflow coverage
  - contract validity
  - blocked workflow threshold
  - average evidence threshold
- Added story-specific E2E release gate:
  - `apps/web/e2e/agent-release-gate.e2e.ts`
  - writes machine-readable artifact report:
    - `apps/web/e2e-artifacts/agent-release-gate-report.json`
- Added test/runner wiring updates for shared and full suites.

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_agent_guardrail_determinism.py apps/agents/tests/integration_tests/test_memory_context_agent.py apps/agents/tests/integration_tests/test_simulation_agent.py apps/agents/tests/integration_tests/test_consensus_agent.py apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Eval harness/unit tests:
  - `pnpm -C apps/web run test -- tests/lib/agents/release-gate.test.ts`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:release-gate`
