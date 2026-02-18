# Story AST-09: LLM Runtime Integration per Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Implement LLM execution path for each Phase 1 agent with provider abstraction and runtime safeguards.

## Why This Matters
- Moves agents from deterministic placeholders to real AI behavior.
- Creates foundation for isolated prompt tuning.

## Scope
- Add provider abstraction layer and per-agent runtime config.
- Integrate LLM invocation for each Phase 1 agent endpoint.
- Enforce timeout/retry and error classification.
- Keep CI integration tests deterministic by mocking required inputs and provider responses.
- Expose a runtime switch/profile so the same endpoints can execute with live provider in non-mocked runs.
- Enforce structured response envelopes and typed domain payloads for all LLM path outcomes.

## Acceptance Criteria
- Each Phase 1 agent endpoint can execute via LLM path.
- LLM invocation includes prompt version and model id in run metadata.
- Agents app integration tests mock required inputs and provider responses per agent (required CI gate).
- Live-provider execution path is available for Phase 1 agents and can be invoked by dedicated evaluation runs.
- LLM output is mapped into structured contract fields; no endpoint returns free-form-only text payloads.
- Story-specific E2E validates LLM-backed run availability from Agent Studio.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- LLM runtime integration in agents app.
- Per-agent runtime configuration.
- Mocked-input integration tests per Phase 1 agent.
- Story E2E suite and evidence.

## Implementation Notes
- Added provider abstraction and execution runtime:
  - `apps/agents/src/agent/llm_runtime.py`
- Added per-agent runtime config:
  - `apps/agents/src/agent/runtime_config.py`
- Integrated LLM runtime into all Phase 1 agent modules:
  - `apps/agents/src/agent/strategist.py`
  - `apps/agents/src/agent/profit_intelligence.py`
  - `apps/agents/src/agent/consensus.py`
  - `apps/agents/src/agent/simulation.py`
  - `apps/agents/src/agent/memory.py`
  - `apps/agents/src/agent/rerank.py`
  - `apps/agents/src/agent/release_loop.py`
- Structured envelope coverage enforced across normal/degraded/blocked/fallback flows.
- Added AST-09 story E2E:
  - `apps/web/e2e/agent-llm-runtime-availability.e2e.ts`
- Added script wiring:
  - `apps/web/package.json` -> `test:e2e:agents:llm-runtime`
  - included in shared/full runners.

## Test Evidence
- Agents integration tests passed:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_llm_runtime_integration.py ...`
- Agents unit tests passed:
  - `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_runtime_config.py ...`
- Story E2E passed:
  - `pnpm -C apps/web run test:e2e:agents:llm-runtime`

## Unit Test Notes
- Added targeted unit coverage for runtime configuration.
- Additional unit-focused coverage continues in AST-10+ for contract/prompt versioning logic.
