# Story AST-03: Sample Context Runner

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Enable one-click execution of each agent using safe seeded sample context.

## Why This Matters
- Lets users explore agent behavior without setup friction.
- Provides a deterministic baseline for prompt tuning and demos.

## Scope
- Add per-agent "Run with sample context" action.
- Map each agent to deterministic mocked/seeded input bundle.
- Capture run metadata for traceability.

## Acceptance Criteria
- Each Phase 1 agent can be executed from sample context in Agent Studio.
- Sample runs return contract-compliant outputs with trust metadata.
- Agents app integration tests include mocked sample-context fixtures per agent.
- Story-specific E2E validates one-click sample run and rendered output state.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Sample context runner implementation.
- Fixture mapping for each Phase 1 agent.
- Mocked-input integration tests per agent sample run.
- Story E2E suite and evidence.
