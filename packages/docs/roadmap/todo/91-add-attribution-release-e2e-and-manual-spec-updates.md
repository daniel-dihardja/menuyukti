# Story 91: Add attribution release E2E and manual/spec updates

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 86

## Goal
Harden attribution as release-ready by adding E2E coverage and updating user manual plus release specs to reflect shipped behavior.

## Why This Matters
- Prevents regressions in a high-value cross-feature workflow.
- Keeps docs synchronized with actual product behavior.
- Maintains roadmap discipline: implemented features must be reflected in release specs.

## Scope
- Add/extend E2E tests for attribution UI, confidence handling, and export path.
- Update user manual with attribution workflow usage and interpretation guidance.
- Update `packages/docs/roadmap/SPECS.md` implementation status tables.
- Ensure release-gate script coverage includes attribution checks where appropriate.

## Acceptance Criteria
- E2E tests pass for core attribution workflow with artifact capture.
- Manual has a dedicated attribution section/chapter with practical guidance.
- `SPECS.md` marks attribution items accurately (implemented/partial).
- Release-gate coverage includes attribution critical checks.

## Deliverables
- New/updated E2E specs for attribution.
- Manual updates under `packages/docs/manual`.
- `SPECS.md` updates aligned to release state.

## Dependencies
- Story 86
- Story 87
- Story 88
- Story 89
- Story 90

