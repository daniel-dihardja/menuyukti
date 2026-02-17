# Story 160: Add Seed Determinism Smoke Check for MVP Release Gate

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Add a deterministic smoke check that validates seeded baseline integrity required by MVP E2E suites.

## Why This Matters
- MVP validation depends on deterministic seeded state.
- Seed drift can silently break E2E and create false regressions.
- Determinism checks catch data-shape issues before expensive full-suite runs.

## Scope
- Validate required baseline entities after seed (`branch`, `analytics`, core menu rows, sequence sanity).
- Run smoke check before full E2E in release-gate path.
- Fail fast with explicit diagnostics when seed state is invalid.

## Acceptance Criteria
- A seed determinism smoke command exists and is wired into release-gate flow.
- Smoke check fails with clear messages when baseline assumptions are broken.
- Full E2E runs only after smoke check passes.

## Deliverables
- Seed determinism smoke script/check.
- Runner/CI wiring for pre-E2E validation.
- Documentation update for expected seed baseline.
