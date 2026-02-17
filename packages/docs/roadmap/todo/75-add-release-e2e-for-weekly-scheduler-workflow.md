# Story 75: Add Release E2E for Weekly Scheduler Workflow

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`

## Goal
Add deterministic E2E coverage for the weekly scheduler path from recommendation to saved schedule.

## Why This Matters
- Scheduling is a marketer-critical path and must be release-gated.
- E2E validation prevents regressions across UI, API, and guardrail integration.

## Scope
- Add E2E scenario for:
  - upload -> matrix recommendations available
  - create weekly schedule draft from recommendations
  - edit an entry and save
  - validate trust/confidence states in scheduler UI
- Capture artifacts (trace/video/screenshot) on failures.
- Wire script into release-gate test suite.

## Data Engineering Requirements
- Use deterministic fixtures with stable recommendation candidates and daypart signals.
- Include at least one low-readiness fixture to assert guardrail downgrade/blocked behavior.

## Acceptance Criteria
- Scheduler E2E passes deterministically in CI.
- Test asserts business outcomes (saved entries + trust states), not only page render.
- Release-gate script includes scheduler workflow execution.

## Deliverables
- New Playwright E2E test(s) for weekly scheduler.
- Fixture updates/utilities for schedule scenarios.
- Release-gate script wiring update.
