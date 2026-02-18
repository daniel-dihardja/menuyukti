# STORY-DC-08: Validation and Release Gate

## Goal
Validate refactor safety with full test coverage, e2e gates, and documentation updates.

## Scope
- Update unit and integration suites
- Update marketer/analyst critical-path E2E flows
- Update specs/manual docs to final behavior

## Deliverables
- Passing test suites for refactored contracts
- Release-gate E2E evidence and artifacts
- Updated specs/manual documentation

## Acceptance Criteria (DoD)
- Release-gate suites pass
- Specs and related docs reflect shipped behavior
- No critical regressions on retained decision pages

## Implementation Notes
- Validation focus:
  - Verify refactor safety across retained decision pages and agent workflows.
  - Keep behavior stable (no product-level workflow changes).
- Test stabilization:
  - Hardened scheduler-related E2E steps in:
    - `apps/web/e2e/analytics-scheduler-workflow.e2e.ts`
    - `apps/web/e2e/release-gate-marketer-analyst.e2e.ts`
  - Added retry logic for `Add Blank Entry` to avoid hydration timing flake in CI/local runs.

## Verification Evidence
- Type and unit/integration checks:
  - `pnpm -C apps/web run typecheck`
  - `pnpm -C apps/web run test`
- Critical-path E2E gate checks:
  - `E2E_DATA_POLICY=seed E2E_SUITE_LIST=test:e2e:matrix,test:e2e:heatmap,test:e2e:pairs,test:e2e:scheduler,test:e2e:attribution,test:e2e:agents:audience,test:e2e:agents:tone,test:e2e:api:contracts,test:e2e:release-gate pnpm -C apps/web run test:e2e:batch`
  - Re-run stabilization check:
    - `E2E_DATA_POLICY=seed E2E_SUITE_LIST=test:e2e:scheduler,test:e2e:release-gate pnpm -C apps/web run test:e2e:batch`
- Result:
  - Release-gate and scheduler suites passing.
  - No critical regressions detected on retained pages and agent flows.
