# Story AST-08: Validation and E2E Gate

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Establish release gates for Agent Studio exploration flows.

## Why This Matters
- Ensures exploration UX and trust states are stable before release.
- Prevents regressions as LLM runtime is added agent-by-agent.

## Scope
- Define required integration and E2E suites for Phase 1 stories.
- Add CI gate for story-level and epic-level suites.
- Include failure artifact standards for debugging.

## Acceptance Criteria
- Required agents integration tests pass before web integration stages.
- Required Agent Studio E2E suites run in CI and local runner.
- Failing gates block merge/release for covered stories.
- Story-specific E2E validates gate wiring and failure reporting.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- CI/release gate updates.
- Test manifest for mandatory story suites.
- Integration + E2E gate documentation.
- Story E2E suite and evidence.

## Implementation Notes
- Added release-gate manifest: `apps/web/e2e/mandatory-suites.json`
  - Defines blocking phase order:
    - `agents-integration` (integration tests first)
    - `web-e2e` (mandatory agent studio suites)
- Added gate runner: `apps/web/scripts/run-release-validation-gate.ts`
  - Enforces blocking order.
  - Emits machine-readable report and per-step logs.
  - Supports dry-run and simulated-failure modes for wiring checks.
- Added story E2E validation:
  - `apps/web/e2e/agent-validation-e2e-gate.e2e.ts`
  - Validates pass + failure report generation.
- Added scripts:
  - `test:agents:integration`
  - `test:e2e:release:validate`
  - `test:e2e:agents:validation-gate`
- Updated documentation:
  - `apps/web/e2e/README.md` with gate usage and artifact standards.

## Test Specs and Evidence
- Story E2E (gate wiring + failure reporting):
  - `pnpm -C apps/web run test:e2e:agents:validation-gate`
- Release gate (live):
  - `pnpm -C apps/web run test:e2e:release:validate`
- Failure artifacts generated at:
  - `apps/web/e2e-artifacts/runner-reports/release-validation-gate-latest.json`
  - `apps/web/e2e-artifacts/gate-logs/*.log`

## Unit Test Rationale
- N/A for this story.
- Changes are orchestration/gate wiring and are covered by the story-specific E2E gate test.
