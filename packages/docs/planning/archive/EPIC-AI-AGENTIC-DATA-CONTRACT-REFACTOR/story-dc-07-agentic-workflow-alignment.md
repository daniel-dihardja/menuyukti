# STORY-DC-07: Agentic Workflow Alignment

## Goal
Ensure agent inputs and outputs use canonical contracts with deterministic evidence.

## Scope
- Align agent input contract to canonical entities
- Enforce output schema with confidence/readiness/evidence refs
- Apply data-quality/freshness guardrails in agent responses

## Deliverables
- Agent contract mapping and schema updates
- Guardrail policy implementation for degraded/blocked states
- Agent output persistence with evidence linkage

## Acceptance Criteria (DoD)
- Agent routes pass traceability and guardrail tests
- No agent output is emitted without contract-compliant evidence fields
- Confidence/readiness behavior matches decision-surface policy

## Implementation Notes
- Scope decision for this iteration:
  - Hold deep agentic-schema expansion for the upcoming dedicated agent epic.
  - Validate that current refactor did not regress existing agent behavior.
- Regression verification completed:
  - Type safety and contract route checks are passing.
  - Agent workflow E2E suites (`audience`, `tone`) are passing with deterministic seeded setup.
  - Guardrail behavior remains stable (`412 AGENT_DATA_NOT_READY` in current seed/readiness context).

## Verification
- `pnpm -C apps/web run typecheck`
- `pnpm -C apps/web run test -- tests/lib/contracts/decision-api-contract.test.ts tests/api/contract-route-shape.test.ts`
- `E2E_DATA_POLICY=seed E2E_SUITE_LIST=test:e2e:agents:audience,test:e2e:agents:tone pnpm -C apps/web run test:e2e:batch`
