# Story AS-05: Multi-Agent Debate and Consensus Engine

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Introduce a consensus mechanism where strategy and risk perspectives produce a final recommendation with explicit tradeoffs.

## Why This Matters
- Improves decision robustness for high-impact recommendations.
- Makes risk/uncertainty visible instead of hidden.

## Scope
- Define strategy-agent and risk-agent roles.
- Build consensus resolver contract and explanation output.
- Provide conservative/aggressive mode selection.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Consensus output includes winning recommendation and disagreement reasons.
- Risk constraints are enforced in final output selection.
- Contract and workflow tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Multi-agent orchestration layer.
- Consensus output schema and UI integration notes.
- Validation tests for disagreement and resolution behavior.

## Implementation Notes
- Added agents app endpoint: `POST /agents/consensus/debate`.
- Added web orchestration endpoint: `GET /api/agents/consensus`.
- Consensus engine now supports mode selection: `conservative` and `aggressive`.
- Consensus output includes winner selection, ranked recommendations, and disagreement reasons.
- Added risk constraints into final selection via risk penalties and confidence/risk flags.
- Added `multi-agent-consensus` to Agent Studio with dedicated runner UI.
- Persisted consensus outputs to `agent_outputs` (`agent_id=multi-agent-consensus`).

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_consensus_agent.py apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:consensus`
