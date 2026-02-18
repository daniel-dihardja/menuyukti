# Story AST-07: Comparison View (Single Session)

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Enable users to compare two runs of the same agent in one session.

## Why This Matters
- Makes prompt/context tuning outcomes visible.
- Helps users understand impact of changed assumptions.

## Scope
- Add run selection for A/B comparison.
- Show differences in recommendation, confidence, readiness, and evidence.
- Highlight fallback/guardrail differences.

## Acceptance Criteria
- Users can select two runs and view a structured diff.
- Diff includes trust metadata changes and key output field changes.
- Agents app integration tests validate deterministic diff inputs using mocked runs.
- Story-specific E2E validates compare flow and diff rendering.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Comparison view UI + diff model.
- Run-diff adapter for Phase 1 agent outputs.
- Integration tests for diff semantics.
- Story E2E suite and evidence.

## Implementation Notes
- Added reusable run-comparison diff model and helper:
  - `apps/web/app/(protected)/agents/[agentId]/run-comparison.ts`
- Added reusable single-session comparison panel:
  - `apps/web/app/(protected)/agents/[agentId]/agent-run-comparison-panel.tsx`
- Wired session run snapshots and comparison panel into all Phase 1 runners:
  - strategist, profit intelligence, consensus, simulation, memory, reranker, release loop
- Added deterministic diff semantics coverage in agents integration tests:
  - `apps/agents/tests/integration_tests/test_comparison_diff_inputs.py`
- Added web unit test coverage for diff row generation:
  - `apps/web/tests/lib/agents/run-comparison.test.ts`
- Added story-specific E2E for compare flow and diff rendering:
  - `apps/web/e2e/agent-run-comparison.e2e.ts`
- Wired E2E scripts/orchestrators/docs:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- `pnpm -C apps/web run typecheck` ✅
- `pnpm -C apps/web exec vitest run tests/lib/agents/run-comparison.test.ts tests/lib/agents/agent-run-history.test.ts` ✅
- `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_comparison_diff_inputs.py` ✅
- `pnpm -C apps/web run test:e2e:agents:run-comparison` ✅
