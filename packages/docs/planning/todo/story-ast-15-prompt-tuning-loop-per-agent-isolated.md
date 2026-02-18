# Story AST-15: Prompt Tuning Loop per Agent (Isolated)

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
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
