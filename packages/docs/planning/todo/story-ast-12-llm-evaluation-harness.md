# Story AST-12: LLM Evaluation Harness

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
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

## Acceptance Criteria
- Harness produces pass/fail results per agent and prompt version.
- Quality thresholds are enforced for merge/release.
- Agents app integration tests run harness scenarios with mocked required inputs.
- Story-specific E2E validates surfaced evaluation state where applicable.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Evaluation harness implementation.
- Rubric + threshold documentation.
- Integration test coverage for harness scenarios.
- Story E2E suite and evidence.
