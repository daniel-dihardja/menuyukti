# Story AST-11: LLM Guardrails and Fallback

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Add robust guardrail and fallback behavior for LLM execution failures or low-trust states.

## Why This Matters
- Keeps agent outputs safe under provider outages and weak context.
- Protects users from untrusted recommendations.

## Scope
- Add fallback path when provider or schema validation fails.
- Add blocked/degraded response states with reason codes.
- Include deterministic fallback payload where applicable.
- Keep fallback/blocked responses in the same structured contract shape as normal responses.

## Acceptance Criteria
- Provider failure triggers explicit fallback or blocked response.
- Low-readiness contexts return degraded/blocked state with reason code.
- Agents app integration tests cover failure modes with mocked inputs/provider errors.
- Guardrail/fallback paths never degrade to free-form-only responses.
- Story-specific E2E validates blocked/degraded/fallback rendering in Agent Studio.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Guardrail and fallback implementation.
- Reason-code catalog for LLM failure states.
- Failure-mode integration tests.
- Story E2E suite and evidence.

## Implementation Notes
- Added runtime failure-mode policy in `apps/agents/src/agent/llm_runtime.py`:
  - `AGENTS_LLM_FAILURE_MODE=fallback|blocked`
  - standardized LLM reason codes
  - shared `resolve_agent_status(...)` guardrail mapper
- Applied guardrail-aware status mapping across agents:
  - `apps/agents/src/agent/strategist.py`
  - `apps/agents/src/agent/profit_intelligence.py`
  - `apps/agents/src/agent/consensus.py`
  - `apps/agents/src/agent/simulation.py`
  - `apps/agents/src/agent/memory.py`
  - `apps/agents/src/agent/rerank.py`
  - `apps/agents/src/agent/release_loop.py`
- Enforced low-readiness handling:
  - readiness `degraded` now returns agent status `degraded` with `DATA_READINESS_DEGRADED` for readiness-gated agents.
- Added reason-code catalog documentation:
  - `packages/docs/contracts/AGENT_PROMPT_MODEL_CONTRACT_V1.md`
- Added UI rendering support for fallback/guardrail states in Agent Studio:
  - strategist/profit/consensus/simulation/memory runners now pass `fallbackUsed` + `guardrailState` to `OutputTrustPanel`.
- Added story E2E:
  - `apps/web/e2e/agent-llm-guardrails-fallback.e2e.ts`
  - script + suite wiring updates in `apps/web/package.json`, `apps/web/scripts/run-e2e-shared-services.ts`, `apps/web/scripts/run-e2e-full.ts`, `apps/web/e2e/README.md`

## Test Evidence
- Agents unit + integration:
  - `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_llm_runtime.py apps/agents/tests/integration_tests/test_llm_runtime_integration.py`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:llm-guardrails-fallback`

## Unit Test Notes
- Added `apps/agents/tests/unit_tests/test_llm_runtime.py` for failure-mode parsing and guardrail status mapping behavior.
