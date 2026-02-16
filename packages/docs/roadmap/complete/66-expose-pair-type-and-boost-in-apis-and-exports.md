# Story 66: Expose Pair Type and Boost in APIs and Exports

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Expose pair-type-aware fields to product APIs and analyst exports.

## Why This Matters
- Keeps UI, external consumers, and analyst workflows consistent.
- Enables transparent decisioning on why a combo ranks highly.

## Scope
- Add `pair_type` to pair/combo marts API responses.
- Add `pair_type` and boost metadata to analyst CSV exports.
- Keep backward-compatible response shapes where possible.

## Acceptance Criteria
- APIs and CSV include pair type consistently.
- Existing clients continue to work with additive fields.

## Deliverables
- Updated routes and export serializers.

