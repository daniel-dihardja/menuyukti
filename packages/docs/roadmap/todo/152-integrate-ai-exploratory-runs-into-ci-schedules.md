# Story 152: Integrate AI exploratory runs into CI schedules

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Run AI exploratory missions automatically in CI (nightly and pre-release) with retained artifacts.

## Why This Matters
- Makes exploratory quality checks continuous rather than ad hoc.
- Catches UI regressions and runtime issues earlier.

## Scope
- Add CI job(s) for autonomous mission runs.
- Configure environment + seed data prerequisites.
- Upload artifacts (screenshots, logs, findings report) as CI outputs.
- Define failure policy (e.g., critical findings fail build, others warn).

## Acceptance Criteria
- Scheduled AI run executes in CI and publishes artifact bundle.
- Pre-release job produces clear pass/fail signal.
- CI output links directly to findings report.

## Deliverables
- CI workflow config + artifact retention policy doc.

## Dependencies
- Stories 149-150.
