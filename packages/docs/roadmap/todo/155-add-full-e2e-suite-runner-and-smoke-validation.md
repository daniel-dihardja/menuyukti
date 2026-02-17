# Story 155: Add Full E2E Suite Runner and Smoke Validation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 151

## Goal
Provide a single command that runs all release-relevant E2E specs after environment/bootstrap orchestration and validates artifact creation on failures.

## Why This Matters
- Ensures release-critical user journeys are tested consistently.
- Makes local and CI quality gates equivalent.
- Produces actionable debug evidence when failures occur.

## Scope
- Define an ordered E2E suite list (or aggregated command).
- Run suite through the orchestrated lifecycle (stories 152-154).
- Validate expected artifacts/logs are created for failed tests.

## Acceptance Criteria
- `test:e2e:full` (or equivalent) runs the complete selected suite.
- Exit code reflects suite result accurately.
- Failure evidence paths are printed in runner output.

## Deliverables
- New top-level E2E full-run command.
- Full-suite execution wiring.
- Smoke check to verify runner behavior from all-services-down state.
