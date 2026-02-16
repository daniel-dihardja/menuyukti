# Story 35: Add E2E Test Pack for Marketer Journeys

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Validate matrix journeys end-to-end using realistic marketer and menu analyst flows.

## Why This Matters
- Ensures production confidence for critical decision screens.
- Protects against regressions in filtering and recommendations.

## Scope
- Add E2E coverage for presets, manual filters, sorting, reset, and URL sharing.
- Assert business outcomes (visible recommended items), not only DOM presence.
- Stabilize selectors and fixtures for CI.

## Data Engineering Requirements
- Test fixtures represent realistic restaurant menu distributions.
- Deterministic seeded data for repeatable assertions.
- Trace test failures to filter-state and row-contract layers.

## Acceptance Criteria
- Tests pass reliably in CI with low flake rate.
- URL state and table results remain consistent.
- Failure artifacts (trace/video/screenshot) are available.

## Deliverables
- Matrix E2E test suite.
- Reusable E2E fixtures/utilities.
