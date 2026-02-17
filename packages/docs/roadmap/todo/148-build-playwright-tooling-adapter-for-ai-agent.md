# Story 148: Build Playwright tooling adapter for AI agent

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Implement the adapter layer that exposes Playwright browser actions to the AI testing agent.

## Why This Matters
- Agent autonomy requires a stable action API over browser controls.
- Keeps browser logic deterministic and observable.

## Scope
- Implement wrapper actions:
  - open url
  - click
  - type/fill
  - select/filter
  - wait/assert-visible
  - screenshot
  - capture console + network errors
- Add timeout, retry, and selector-failure normalization.
- Add per-step action logging with timestamps.

## Acceptance Criteria
- Adapter can execute scripted action sequences reliably.
- Errors are normalized and returned with actionable metadata.
- Adapter outputs screenshots and logs to deterministic paths.

## Deliverables
- Playwright adapter module + typed action/result interfaces.

## Dependencies
- Story 147.
