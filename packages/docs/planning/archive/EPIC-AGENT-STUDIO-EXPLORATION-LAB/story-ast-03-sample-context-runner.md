# Story AST-03: Sample Context Runner

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
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

## Implementation Notes
- Added reusable sample context helper for deterministic location/analytics fallback and UI state application:
  - `apps/web/app/(protected)/agents/[agentId]/sample-context.ts`
- Added `Run Sample Context` actions for all Phase 1 runners:
  - strategist, profit intelligence, consensus, simulation, memory, reranker, release loop.
- Added story E2E:
  - `apps/web/e2e/agent-sample-context-runner.e2e.ts`
- Added web unit test for sample-context helper:
  - `apps/web/tests/lib/agents/sample-context.test.ts`
- Added agents integration fixtures coverage for sample-context paths:
  - `apps/agents/tests/integration_tests/test_sample_context_fixtures.py`
- Wired suite into scripts and docs:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- `pnpm -C apps/web run typecheck` ✅
- `pnpm -C apps/web exec vitest run tests/lib/agents/sample-context.test.ts` ✅
- `uv run --project apps/agents pytest apps/agents/tests/integration_tests` ✅
- `pnpm -C apps/web run test:e2e:agents:sample-context` ✅
