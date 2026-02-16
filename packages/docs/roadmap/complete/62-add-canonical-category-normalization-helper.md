# Story 62: Add Canonical Category Normalization Helper

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Create a reusable normalization helper so category values map consistently to food/drink classes.

## Why This Matters
- Prevents split logic between SQL, API, and UI.
- Improves accuracy of pair typing and ranking.

## Scope
- Add category normalization mapping (case, spacing, aliases).
- Define canonical category families (`food`, `drink`, `unknown`).
- Add unit tests for mapping behavior.

## Acceptance Criteria
- Known category synonyms map deterministically.
- Unknown values map to `unknown` without runtime failures.

## Deliverables
- Normalization helper + tests.

