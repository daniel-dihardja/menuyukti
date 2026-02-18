# STORY-DC-06: UI Refactor by Surface (No Route Removal)

## Goal
Adapt retained analytics pages to canonical contracts without removing any route.

## Scope
- Migrate UI data consumption for matrix, heatmap, pairs, scheduler, attribution/related views
- Preserve current user journeys and filtering behavior

## Deliverables
- Updated page-level adapters/selectors
- Canonical contract integration across decision surfaces
- UX parity checks for core workflows

## Acceptance Criteria (DoD)
- Each retained page renders correctly using canonical contract data
- Existing user workflows remain functional
- No route removals or regressions in critical navigation flows

## Implementation Notes
- Added shared UI contract summary component:
  - `apps/web/components/decision-contract-banner.tsx`
- Integrated canonical contract rendering into retained analytics surfaces:
  - `apps/web/app/(protected)/analytics/[analyticsId]/matrix/page.tsx`
  - `apps/web/app/(protected)/analytics/[analyticsId]/heatmap/page.tsx`
  - `apps/web/app/(protected)/analytics/[analyticsId]/pairs/page.tsx`
  - `apps/web/app/(protected)/analytics/[analyticsId]/attribution/page.tsx`
  - `apps/web/app/(protected)/analytics/[analyticsId]/scheduler/page.tsx`
  - `apps/web/app/(protected)/analytics/[analyticsId]/scheduler/scheduler-client.tsx`
- Scheduler client now consumes and updates contract payload from scheduler API responses (`POST`/`PATCH`).

## Verification
- `pnpm -C apps/web run typecheck`
- `pnpm -C apps/web run test -- tests/api/contract-route-shape.test.ts tests/lib/contracts/decision-api-contract.test.ts`
- `E2E_DATA_POLICY=seed pnpm -C apps/web run test:e2e:batch:smoke`
