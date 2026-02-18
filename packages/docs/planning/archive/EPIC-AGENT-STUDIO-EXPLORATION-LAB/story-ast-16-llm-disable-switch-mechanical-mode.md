# Story AST-16: LLM Disable Switch (Mechanical Mode)

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Allow disabling live LLM calls globally via runtime config/env var so the app can be tested in deterministic mechanical mode.

## Why This Matters
- Enables stable regression checks independent of provider/network/model drift.
- Gives product and QA a safe mode to verify UX, contracts, trust rendering, run history, and compare flows.

## Scope
- Add a global runtime flag (for example `AGENTS_LLM_ENABLED`).
- When disabled:
  - no live LLM/provider call is attempted
  - deterministic fallback path is used
  - trust metadata clearly signals fallback/mechanical mode
- Keep mechanical-mode responses in the same structured contract shape as LLM-enabled mode.
- Document behavior and local usage.

## Acceptance Criteria
- A single env/runtime switch disables LLM calls across all in-scope agents.
- Agent pages still run end-to-end with deterministic outputs and trust metadata.
- Run history and comparison views continue to function in mechanical mode.
- Agents integration tests validate disabled-mode behavior.
- Mechanical mode preserves structured envelope + typed payload fields for all agents.
- Story-specific E2E validates mechanical-mode runs and visible fallback/trust signals.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Runtime config and guard that bypasses LLM execution when disabled.
- Mechanical-mode contract/trust marker in responses.
- Integration tests for enabled vs disabled behavior.
- Story E2E suite and evidence.

## Implementation Notes
- Verified existing runtime switch path:
  - `apps/agents/src/agent/llm_runtime.py` (`AGENTS_LLM_ENABLED`)
- Expanded disabled-mode integration coverage to all in-scope Phase 1 endpoints:
  - `apps/agents/tests/integration_tests/test_llm_runtime_integration.py`
- Added story-specific mechanical-mode E2E (LLM disabled) that validates:
  - trust panel `llm: disabled`
  - run history continuity
  - run comparison continuity
  - `apps/web/e2e/agent-llm-disabled-mechanical-mode.e2e.ts`
- Added script wiring and suite inclusion:
  - `apps/web/package.json` -> `test:e2e:agents:llm-disabled-mode`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
- Added E2E documentation entry:
  - `apps/web/e2e/README.md`

## Test Evidence
- Agents integration tests passed:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_llm_runtime_integration.py`
- Story E2E passed:
  - `pnpm -C apps/web run test:e2e:agents:llm-disabled-mode`

## Unit Test Notes
- No new isolated unit-level logic was introduced in AST-16.
- Coverage was added at integration/E2E layers where mechanical-mode behavior is validated end-to-end.
