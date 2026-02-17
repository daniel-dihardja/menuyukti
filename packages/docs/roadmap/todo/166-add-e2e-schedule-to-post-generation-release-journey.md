# Story 166: Add E2E Schedule to Post Generation Release Journey

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Add release-gate E2E coverage for weekly suggestion to approved draft journey.

## Why This Matters
- Protects MVP path that produces marketer-facing Instagram output.

## Scope
- Add Playwright/tsx E2E scenario for scheduler post generation flow.
- Cover suggestion rendering, suggestion apply, edit, save, approve, and export.
- Wire suite into full runner coverage reports.

## Acceptance Criteria
- E2E passes on seeded deterministic data.
- Coverage report includes this new scenario.
- Failure artifacts are actionable for debugging.
- Suite is included in default full lifecycle run.

## Deliverables
- New E2E test file and npm script.
- Full runner suite registration.
- Report mapping update (if required).
