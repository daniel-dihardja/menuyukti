# Story 159: Harden MVP E2E Suite Stability and Failure Diagnostics

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Reduce flaky E2E behavior across MVP scenarios and ensure failures produce immediately actionable diagnostics.

## Why This Matters
- Flaky tests undermine confidence even when functionality is correct.
- Faster root-cause debugging reduces release delays.
- Stable E2E execution is the main safeguard for MVP scope freeze.

## Scope
- Stabilize selectors and async waits in remaining fragile E2E steps.
- Ensure all suites emit useful status context before failing.
- Keep deterministic behavior with seeded data assumptions.

## Acceptance Criteria
- Repeated local runs produce consistent outcomes for full suite.
- Failure output includes request/status context for failing steps.
- No known flaky selector remains in MVP critical-path suites.

## Deliverables
- E2E script refinements.
- Standardized failure diagnostics in critical suites.
- Validation notes from repeated runner executions.
