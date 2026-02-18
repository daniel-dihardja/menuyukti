# Story AS-12: Agent Studio Overview Grid and Per-Agent Output Sandbox

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Provide a persistent Agent Studio experience where users can discover agents in an overview grid, open each agent individually, and test outputs safely.

## Why This Matters
- Improves discoverability and trust by making agents explorable and testable one by one.
- Creates a stable UX shell for iterative rollout of new agents without changing navigation patterns.

## Scope
- Keep `/agents` as an overview grid with agent cards and status labels.
- Keep per-agent detail pages as output sandboxes with explicit run/test actions.
- Show required trust/readiness metadata on each sandbox output.
- Support empty/coming-soon states without broken navigation.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Agent Studio grid route exists and renders active/coming-soon agent cards.
- Each released agent can be opened and tested on its dedicated detail page.
- Sandbox output includes confidence/readiness/evidence metadata where applicable.
- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Agent Studio UX contract (grid + detail sandbox behavior).
- Route and navigation updates preserving per-agent exploration flow.

## Implementation Notes
- Updated Agent Studio overview grid behavior:
  - `ready` agents remain clickable cards (`/agents/:id`)
  - non-ready agents render as non-clickable `Coming Soon` cards
  - file: `apps/web/app/(protected)/agents/page.tsx`
- Updated per-agent detail behavior:
  - `ready` agents keep runnable sandbox components
  - non-ready agents show explicit `Coming Soon` state
  - file: `apps/web/app/(protected)/agents/[agentId]/page.tsx`
- Added dedicated AS-12 E2E:
  - validates `/agents` grid discoverability
  - verifies each ready agent has reachable sandbox API path
  - verifies each ready agent detail page is openable and renders inputs/outputs
  - verifies draft agents (if present) show `Coming Soon`
  - file: `apps/web/e2e/agent-studio-overview-sandbox.e2e.ts`
- Added script and suite-runner wiring:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests`
- Web type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:studio-overview-sandbox`
