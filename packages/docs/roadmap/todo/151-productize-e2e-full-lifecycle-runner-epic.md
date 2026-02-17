# Story 151: Productize E2E Full Lifecycle Runner (Shared DB Transition)

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Establish a single E2E lifecycle runner that can start from all services down, provision deterministic test state on the current shared DB, run all E2E suites, and reset state after completion.

## Why This Matters
- Removes manual setup drift and flaky local/CI execution differences.
- Gives deterministic evidence that core release paths work from a cold start.
- Enables safe transitional usage of the current DB until a dedicated E2E DB/schema is introduced.

## Scope
- Define the MVP lifecycle for E2E orchestration and teardown.
- Use current DB with explicit safety guardrails.
- Ensure all required services (web, analytics, agents) are started by the runner.

## Acceptance Criteria
- A documented parent workflow exists for full E2E lifecycle execution.
- Child stories cover orchestration, DB lifecycle, safety checks, and docs.
- The epic can be closed only when one command executes cold-start-to-reset successfully.

## Deliverables
- Epic story file with child breakdown and release intent.

## Notes
- This epic intentionally targets transitional shared-DB operation, not final isolated test-infra design.
