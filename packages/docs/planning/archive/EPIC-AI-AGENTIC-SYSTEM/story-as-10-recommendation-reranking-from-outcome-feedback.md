# Story AS-10: Recommendation Re-Ranking from Outcome Feedback

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Implement feedback-aware recommendation re-ranking while preserving explainability and fallback safety.

## Why This Matters
- Converts captured outcome signals into practical recommendation quality gains.
- Enables controlled self-improvement with transparent logic.

## Scope
- Blend baseline deterministic score with outcome-success priors.
- Surface rank-change explainability fields.
- Add fallback to baseline ranking when learning signal quality is insufficient.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Re-ranking logic is deterministic for identical inputs and policy version.
- Rank changes are explainable and auditable.
- Baseline fallback triggers correctly under weak-signal conditions.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Re-ranking policy implementation.
- Explainability field extensions in output contract.
- Tests for rank behavior, fallback, and policy versioning.

## Implementation Notes
- Added agents app rerank endpoint: `POST /agents/rerank/recommendations`.
- Implemented deterministic policy with versioning:
  - policy version field (`policy_version`)
  - baseline + feedback blending
  - explicit `fallback_to_baseline` behavior under weak signals
- Added rank explainability fields:
  - `baseline_rank`, `final_rank`, `rank_delta`
  - `baseline_score`, `feedback_boost`, `final_score`
  - explainability payload (`policy_version`, `fallback_to_baseline`, explanation)
- Added web reranking route:
  - `GET /api/agents/profit-intelligence/reranked`
- Added reranker UI surface (`feedback-reranker`) in Agent Studio.
- Added reranking E2E with both branches:
  - non-fallback rerank under sufficient feedback
  - fallback branch under high `minSignals` threshold

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_rerank_agent.py apps/agents/tests/integration_tests/test_learning_eligibility_agent.py apps/agents/tests/integration_tests/test_agent_guardrail_determinism.py apps/agents/tests/integration_tests/test_memory_context_agent.py apps/agents/tests/integration_tests/test_simulation_agent.py apps/agents/tests/integration_tests/test_consensus_agent.py apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:reranking`
