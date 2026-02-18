# Story AST-15: Prompt Tuning Loop per Agent (Isolated)

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Tune each Phase 1 agent prompt iteratively using isolated mocked-input scenarios until quality thresholds are met.

## Why This Matters
- Converts basic LLM connectivity into reliable decision-quality outputs.
- Produces measurable prompt quality improvements with audit trail.

## Scope
- Run iterative prompt tuning cycles per agent.
- Track quality by prompt version against fixed mocked scenario sets.
- Freeze prompt versions that pass thresholds.
- Preserve structured output contracts while tuning prompt phrasing and content quality.

## Acceptance Criteria
- Each Phase 1 agent reaches epic quality thresholds on mocked scenarios.
- Prompt tuning evidence is stored per agent + prompt version.
- Agents app integration tests verify passing prompt versions and regression protections.
- Tuning changes do not break structured envelope or typed payload schemas.
- Story-specific E2E validates final tuned outputs appear in Agent Studio with trust metadata.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Tuned prompt versions per Phase 1 agent.
- Prompt tuning result logs/report.
- Integration tests locking expected quality thresholds.
- Story E2E suite and evidence.

## Implementation Notes
- Added tuned prompt variants for all Phase 1 agents:
  - `apps/agents/prompts/*/v1-tuned.txt`
- Added frozen approved prompt version map:
  - `apps/agents/prompts/PROMPT_VERSION_FREEZE_V1.json`
- Updated runtime prompt default resolution to use frozen map first:
  - `apps/agents/src/agent/runtime_config.py`
- Extended prompt contract registry with tuned versions:
  - `apps/agents/src/agent/prompt_contracts.py`
- Added isolated prompt tuning loop engine:
  - `apps/agents/src/agent/prompt_tuning.py`
- Added agents API endpoint:
  - `POST /agents/evaluation/prompt-tuning`
  - in `apps/agents/src/agent/api.py`
- Added CLI for tuning loop report and optional freeze-map writing:
  - `apps/agents/scripts/run_prompt_tuning_loop.py`
- Added prompt tuning contract/reference document:
  - `packages/docs/contracts/AGENT_PROMPT_TUNING_LOOP_V1.md`
- Added tests:
  - unit: `apps/agents/tests/unit_tests/test_prompt_tuning.py`
  - integration: `apps/agents/tests/integration_tests/test_prompt_tuning_loop.py`
- Added story-specific E2E validating tuned prompt version appears in Agent Studio with trust metadata:
  - `apps/web/e2e/agent-prompt-tuning-loop.e2e.ts`
  - wired in:
    - `apps/web/package.json`
    - `apps/web/scripts/run-e2e-shared-services.ts`
    - `apps/web/scripts/run-e2e-full.ts`
    - `apps/web/e2e/README.md`

## Test Evidence
- Agents tests:
  - `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_prompt_tuning.py apps/agents/tests/integration_tests/test_prompt_tuning_loop.py apps/agents/tests/unit_tests/test_prompt_contracts.py apps/agents/tests/unit_tests/test_runtime_config.py`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:prompt-tuning-loop`
- Web regression:
  - `pnpm -C apps/web run typecheck`

## Unit Test Notes
- Added unit tests for prompt-version discovery and approval selection loop behavior in `test_prompt_tuning.py`.
