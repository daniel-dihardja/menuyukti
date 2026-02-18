# Story AST-04: Selected Context Runner

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Allow running each agent with user-selected location and analytics context.

## Why This Matters
- Connects exploration to real decision context.
- Enables side-by-side comparison of sample vs real-context outputs.

## Scope
- Support location/analytics selector-driven runs.
- Validate context prerequisites before execution.
- Surface blocked/degraded states when context is insufficient.

## Acceptance Criteria
- Users can run Phase 1 agents with selected location + analytics context.
- Invalid or missing context produces explicit blocked/degraded state.
- Agents app integration tests mock selected-context payload variants.
- Story-specific E2E validates selected-context run flow and state transitions.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Selected context run orchestration.
- Guardrail checks for context availability.
- Mocked-input integration tests for selected-context variants.
- Story E2E suite and evidence.

## Implementation Notes
- Added shared selected-context state helper:
  - `apps/web/app/(protected)/agents/[agentId]/selected-context.ts`
- Updated all Phase 1 runner panels to show explicit selected-context state and reason:
  - `selected context: blocked | degraded | ready`
  - run actions are gated by selected-context readiness
- Added story E2E validating selected-context transitions and run flow across ready agents:
  - `apps/web/e2e/agent-selected-context-runner.e2e.ts`
- Added agents integration tests for selected-context payload variants (presence/absence of `location_id` and `analytics_id`):
  - `apps/agents/tests/integration_tests/test_selected_context_variants.py`
- Added unit tests for selected-context helper logic:
  - `apps/web/tests/lib/agents/selected-context.test.ts`
- Wired selected-context suite into scripts and service orchestrators:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- `pnpm -C apps/web run typecheck` ✅
- `pnpm -C apps/web exec vitest run tests/lib/agents/selected-context.test.ts tests/lib/agents/sample-context.test.ts` ✅
- `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_selected_context_variants.py` ✅
- `pnpm -C apps/web run test:e2e:agents:selected-context` ✅
