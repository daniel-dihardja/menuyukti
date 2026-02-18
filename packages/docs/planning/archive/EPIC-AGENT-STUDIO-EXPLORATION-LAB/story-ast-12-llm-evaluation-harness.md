# Story AST-12: LLM Evaluation Harness

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Create an evaluation harness for response quality, trust completeness, and fallback correctness.

## Why This Matters
- Provides objective quality gate for prompt tuning.
- Ensures releases are based on measured quality, not ad-hoc checks.

## Scope
- Define evaluation rubric for actionability/readability.
- Implement automated checks for schema and trust fields.
- Track evaluation results per agent/prompt version.
- Add live-provider evaluation mode (mocked upstream inputs + real LLM calls) for Phase 1 validation.
- Add checks that enforce structured envelope presence and typed domain payload validity.

## Acceptance Criteria
- Harness produces pass/fail results per agent and prompt version.
- Quality thresholds are enforced for merge/release.
- Agents app integration tests run harness scenarios with mocked required inputs (default required CI gate).
- Harness supports live-provider evaluation runs (mocked upstream inputs + real LLM calls) for release readiness in Phase 1.
- Harness fails any response that is free-form-only or missing structured contract sections.
- Story-specific E2E validates surfaced evaluation state where applicable.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Evaluation harness implementation.
- Rubric + threshold documentation.
- Integration test coverage for harness scenarios.
- Story E2E suite and evidence.

## Implementation Notes
- Added evaluation harness module with per-agent mocked-input scenarios and scoring:
  - `apps/agents/src/agent/evaluation_harness.py`
- Added agents API endpoint:
  - `POST /agents/evaluation/harness`
  - implemented in `apps/agents/src/agent/api.py`
- Added CLI runner to emit JSON artifacts and optional fail-on-fail exit code:
  - `apps/agents/scripts/run_llm_evaluation_harness.py`
- Added web API surface to expose harness state for validation workflows:
  - `apps/web/app/api/agents/evaluation/harness/route.ts`
- Added story E2E:
  - `apps/web/e2e/agent-llm-evaluation-harness.e2e.ts`
  - script wiring updates in:
    - `apps/web/package.json`
    - `apps/web/scripts/run-e2e-shared-services.ts`
    - `apps/web/scripts/run-e2e-full.ts`
    - `apps/web/e2e/README.md`

## Rubric + Thresholds
- Threshold:
  - `quality_score_min = 0.70`
- Contract checks (must pass):
  - required structured envelope fields
  - run metadata presence
  - llm metadata presence
  - typed domain payload validity
  - fallback-state consistency checks
- Quality checks (scored):
  - readability
  - actionability

## Test Evidence
- Agents unit + integration:
  - `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_evaluation_harness.py apps/agents/tests/integration_tests/test_llm_evaluation_harness.py`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:llm-evaluation-harness`

## Unit Test Notes
- Added unit tests for isolated harness evaluation logic and report shape.
