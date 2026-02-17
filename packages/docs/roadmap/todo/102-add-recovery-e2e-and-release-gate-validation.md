# Story 102: Add recovery E2E and release-gate validation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 98

## Goal
Validate retry/replay/backfill workflows with automated E2E checks and release-gate assertions.

## Why This Matters
- Ensures operational recovery features stay reliable under changes.
- Adds confidence that failure-handling paths are production-ready.

## Scope
- Add E2E journey for at least one retry and one backfill/replay path.
- Validate guardrail rejection behavior in E2E.
- Include artifact capture for failures.
- Extend release-gate checks to include recovery workflow smoke validation.

## Acceptance Criteria
- E2E suite covers successful and blocked recovery scenarios.
- Tests produce diagnostics artifacts on failure.
- Release-gate includes recovery verification step.

## Deliverables
- New/updated E2E spec files.
- Script wiring for recovery E2E execution.

