# Story AST-10: Prompt and Model Contract Versioning

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Define and version prompt/model contracts for each Phase 1 agent.

## Why This Matters
- Makes prompt changes auditable and reversible.
- Prevents silent schema drift in outputs.

## Scope
- Create prompt template files/specs per agent.
- Enforce output-schema constraints in prompt contract.
- Add version labels for prompt and model in outputs and logs.
- Define envelope schema + typed domain schema as first-class contract artifacts.

## Acceptance Criteria
- Each Phase 1 agent has `prompt_version` and `model_id` contract fields.
- Prompt templates are versioned and referenced at runtime.
- Agents app integration tests validate schema compliance across prompt versions.
- Contract versions explicitly cover structured envelope fields and typed domain payload fields.
- Story-specific E2E validates prompt/model version visibility in Agent Studio output metadata.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Prompt/model contract docs + runtime mapping.
- Version-aware prompt loading.
- Integration tests for contract version behavior.
- Story E2E suite and evidence.

## Implementation Notes
- Added prompt contract registry + required output-key constraints:
  - `apps/agents/src/agent/prompt_contracts.py`
- Added versioned prompt template files:
  - `apps/agents/prompts/**`
- Added per-agent runtime overrides for prompt/model:
  - `AGENTS_PROMPT_VERSION_<AGENT_ID_NORMALIZED>`
  - `AGENTS_MODEL_ID_<AGENT_ID_NORMALIZED>`
  - implemented in `apps/agents/src/agent/runtime_config.py`
- Wired Agent Studio output metadata visibility (`model`, `prompt`, provider, mode, llm status):
  - `apps/web/app/(protected)/agents/[agentId]/output-trust-panel.tsx`
  - runner pages updated to pass run metadata
- Updated release-loop web route to preserve upstream run metadata in response/persistence:
  - `apps/web/app/api/agents/learning/release-loop/route.ts`
- Added prompt/model contract reference doc:
  - `packages/docs/contracts/AGENT_PROMPT_MODEL_CONTRACT_V1.md`

## Test Evidence
- Agents tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_llm_runtime_integration.py`
  - `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_runtime_config.py apps/agents/tests/unit_tests/test_prompt_contracts.py`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:prompt-model-visibility`

## Unit Test Notes
- Added/updated unit tests for runtime override and prompt-contract resolution behavior.
