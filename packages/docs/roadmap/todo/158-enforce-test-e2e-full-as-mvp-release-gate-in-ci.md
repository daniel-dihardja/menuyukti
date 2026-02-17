# Story 158: Enforce `test:e2e:full` as MVP Release Gate in CI

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Make `pnpm -C apps/web run test:e2e:full` a required release-gate check in CI for MVP branches.

## Why This Matters
- Ensures release readiness is validated consistently using the same lifecycle flow as local runs.
- Prevents shipping MVP regressions when only partial checks pass.
- Aligns release approval with deterministic scenario coverage and pass-rate evidence.

## Scope
- Add/adjust CI workflow to execute full lifecycle E2E runner.
- Fail CI when pass rate is below 100% or runner exits non-zero.
- Preserve artifacts/logs for failed runs.

## Acceptance Criteria
- CI runs `test:e2e:full` for release-eligible branches/PRs.
- CI fails on any failing suite.
- Runner report and logs are uploaded as CI artifacts.

## Deliverables
- CI workflow update.
- Artifact retention config for runner logs/reports.
- Release-gate note in roadmap/manual docs if needed.
