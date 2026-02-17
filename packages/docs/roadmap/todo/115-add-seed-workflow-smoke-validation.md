# Story 115: Add seed workflow smoke validation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 110

## Goal
Add lightweight validation that seed/export workflow remains operational after changes.

## Why This Matters
- Prevents silent regressions in critical local setup commands.
- Protects release velocity by keeping dev bootstrap deterministic.

## Scope
- Add a smoke script/check that verifies:
  - `db:seed` command wiring exists and executes,
  - expected seed artifact path exists or reports clear error,
  - key tables have non-zero rows after seed (when artifact contains data).
- Integrate check into a suitable local QA command (not necessarily full release-gate).

## Acceptance Criteria
- Validation fails fast with actionable message when seed setup is broken.
- Validation passes in normal local workflow after export + seed.

## Deliverables
- Smoke validation script and package script entry.
