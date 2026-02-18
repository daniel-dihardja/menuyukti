# STORY-DC-05: API Contract Migration for Analytics and Agent Routes

## Goal
Move API responses to canonical decision contract shape.

## Scope
- Implement shared typed DTOs
- Migrate target routes (`matrix`, `heatmap`, `pairs`, `scheduler`, agent routes)
- Add contract tests for readiness and failure states

## Deliverables
- Shared DTO types and adapters
- Route response migration to canonical contract
- Contract test coverage for critical routes

## Acceptance Criteria (DoD)
- Target routes expose canonical fields consistently
- Contract tests pass in CI
- Readiness/confidence/evidence fields are present and validated

## Implementation Notes
- Added shared canonical DTO/helpers:
  - `apps/web/lib/contracts/decision-api-contract.ts`
- Migrated route responses to include additive `contract` payload (without removing existing fields):
  - `apps/web/app/api/analytics/[analyticsId]/matrix-metadata/route.ts`
  - `apps/web/app/api/marts/daypart-performance/route.ts`
  - `apps/web/app/api/marts/pair-metrics/route.ts`
  - `apps/web/app/api/marts/combo-opportunities/route.ts`
  - `apps/web/app/api/instagram/schedules/route.ts`
  - `apps/web/app/api/agents/audience/route.ts`
  - `apps/web/app/api/agents/tone/route.ts`

## Test Specs and Coverage
- Shared contract/readiness adapter tests:
  - `apps/web/tests/lib/contracts/decision-api-contract.test.ts`
- Route-level contract shape tests (failure/readiness envelope presence):
  - `apps/web/tests/api/contract-route-shape.test.ts`
- API contract E2E (runtime route checks with seeded data):
  - `apps/web/e2e/api-contracts.e2e.ts`
- E2E auto data-initialization helper and policy documentation:
  - `apps/web/e2e/_helpers/data-setup.ts`
  - `apps/web/e2e/README.md`
- E2E service lifecycle runner (start required services before suite, stop after suite):
  - `apps/web/scripts/run-e2e-suite.ts`
  - `apps/web/package.json` (`test:e2e:*` scripts routed through suite runner)
- Verification commands:
  - `pnpm -C apps/web run typecheck`
  - `pnpm -C apps/web run test -- tests/lib/contracts/decision-api-contract.test.ts tests/api/contract-route-shape.test.ts`
  - `pnpm -C apps/web run test:e2e:api:contracts`
