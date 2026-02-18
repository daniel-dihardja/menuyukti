# Story AST-06: Agent Run History (Lightweight)

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Add lightweight run history per agent page for recent executions and outcomes.

## Why This Matters
- Supports debugging and comparison workflows.
- Gives users a timeline of runs and confidence changes.

## Scope
- Persist recent run records with timestamps and status.
- Show latest run list on each agent detail page.
- Include prompt version, model id, and fallback usage indicator.

## Acceptance Criteria
- Recent run list is visible and scoped by agent + context.
- Run records include minimum metadata (status, timestamp, prompt/model versions).
- Agents app integration tests validate run-history persistence contract.
- Story-specific E2E validates run history list updates after execution.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Run history storage/read APIs.
- Agent detail run-history panel.
- Integration tests for history write/read behavior.
- Story E2E suite and evidence.

## Implementation Notes
- Added run-history mapping helper for `agent_outputs` rows:
  - `apps/web/lib/agents/agent-run-history.ts`
- Added run-history read API:
  - `apps/web/app/api/agents/run-history/route.ts`
- Added reusable agent run-history panel component:
  - `apps/web/app/(protected)/agents/[agentId]/agent-run-history-panel.tsx`
- Wired run-history panel into all Phase 1 runners.
- Added persistence for agents that previously did not write `agent_outputs`:
  - `apps/web/app/api/agents/memory/route.ts`
  - `apps/web/app/api/agents/learning/release-loop/route.ts`
- Added tests:
  - `apps/web/tests/lib/agents/agent-run-history.test.ts`
  - `apps/web/e2e/agent-run-history.e2e.ts`
- Wired E2E scripts/docs:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- `pnpm -C apps/web run typecheck` ✅
- `pnpm -C apps/web exec vitest run tests/lib/agents/agent-run-history.test.ts tests/lib/agents/selected-context.test.ts tests/lib/agents/sample-context.test.ts` ✅
- `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_trust_contract_fields.py` ✅
- `pnpm -C apps/web run test:e2e:agents:run-history` ✅
