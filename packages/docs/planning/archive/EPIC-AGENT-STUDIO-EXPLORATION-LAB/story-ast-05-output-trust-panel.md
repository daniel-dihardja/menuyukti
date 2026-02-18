# Story AST-05: Output Trust Panel

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Standardize output trust display across agents: confidence, readiness, evidence, lineage, and guardrail state.

## Why This Matters
- Prevents over-trusting weak outputs.
- Makes outputs auditable and operationally safe.

## Scope
- Build reusable trust panel component for agent outputs.
- Include confidence/readiness/evidence/lineage/guardrail fields.
- Render fallback/blocked reasons explicitly.

## Acceptance Criteria
- All Phase 1 agent pages display trust panel for run outputs.
- Trust panel fields are present and consistently formatted.
- Agents app integration tests validate trust field presence in response contracts.
- Story-specific E2E validates trust panel rendering for ready and degraded states.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Reusable trust panel UI.
- Contract adapters for all Phase 1 agent outputs.
- Integration tests for trust metadata contract completeness.
- Story E2E suite and evidence.

## Implementation Notes
- Added reusable trust panel component:
  - `apps/web/app/(protected)/agents/[agentId]/output-trust-panel.tsx`
- Wired trust panel into all Phase 1 runners:
  - strategist, profit intelligence, consensus, simulation, memory, reranker, release loop
- Normalized error-path handling in runners to preserve response payload contracts when non-2xx responses occur.
- Added/extended contract envelopes for routes that previously lacked trust metadata:
  - `apps/web/app/api/agents/memory/route.ts`
  - `apps/web/app/api/agents/learning/release-loop/route.ts`
- Added dedicated agents integration test for trust-contract fields:
  - `apps/agents/tests/integration_tests/test_trust_contract_fields.py`
- Added story-specific E2E for trust panel rendering and trust-state verification:
  - `apps/web/e2e/agent-output-trust-panel.e2e.ts`
- Wired new E2E suite into scripts/orchestrators/docs:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- `pnpm -C apps/web run typecheck` ✅
- `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_trust_contract_fields.py` ✅
- `pnpm -C apps/web exec vitest run tests/lib/contracts/decision-api-contract.test.ts` ✅
- `pnpm -C apps/web run test:e2e:agents:output-trust-panel` ✅
