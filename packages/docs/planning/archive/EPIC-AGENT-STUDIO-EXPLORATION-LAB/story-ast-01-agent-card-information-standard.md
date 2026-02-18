# Story AST-01: Agent Card Information Standard

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Standardize Agent Studio overview cards so users can immediately understand each agent's purpose, persona, trust scope, and readiness.

## Why This Matters
- Improves discoverability and onboarding speed.
- Reduces misuse by clarifying what each agent is intended to do.

## Scope
- Define required card fields: agent name, persona, purpose, status, trust scope.
- Add consistent visual treatment for `ready` vs `coming_soon`.
- Ensure card metadata derives from versioned agent definitions.

## Acceptance Criteria
- All in-scope Phase 1 agents render the same required card fields.
- Card status semantics are consistent across grid and detail page entry.
- Agents app integration tests pass before web integration changes are enabled.
- Story-specific E2E validates card discoverability and status labeling.

## Deliverables
- Agent card schema/documentation update.
- Web UI implementation for standardized cards.
- Agents app integration tests (mocked input baseline unaffected).
- Story E2E suite and execution evidence.

## Implementation Notes
- Extended agent definition schema with standardized metadata:
  - `schemaVersion`
  - `purpose`
  - `persona`
  - `trustScope`
  - files: `apps/web/lib/agent-definitions.ts`, `apps/web/lib/agents.json`
- Updated Agent Studio overview cards to render required AST-01 fields:
  - status badge
  - persona badge
  - trust-scope badge
  - purpose text
  - stable selectors for E2E checks
  - file: `apps/web/app/(protected)/agents/page.tsx`
- Added story-specific E2E suite:
  - file: `apps/web/e2e/agent-card-information-standard.e2e.ts`
- Added E2E script and runner wiring:
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
  - `pnpm -C apps/web run test:e2e:agents:card-standard`
