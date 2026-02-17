# Story 137: Clean operations tests and release-gate dependencies

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 134

## Goal
Update tests and release-gate scripts to remove dependency on operations feature.

## Why This Matters
- Release quality checks must reflect actual MVP scope.
- Avoids false failures from intentionally removed capabilities.

## Scope
- Remove/retire operations-specific E2E suites from MVP gate.
- Keep ETL reliability tests that validate upload and downstream analytics outputs.
- Update CI/test commands accordingly.

## Acceptance Criteria
- MVP release gate passes without operations feature checks.
- Core upload -> COGS -> matrix path remains covered.

## Deliverables
- Updated test scripts and release-gate configuration.

## Dependencies
- Stories 135-136.
