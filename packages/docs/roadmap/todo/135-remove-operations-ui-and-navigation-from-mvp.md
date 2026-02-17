# Story 135: Remove operations UI and navigation from MVP

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 134

## Goal
Remove operations workflow screens and navigation entry points from the MVP UI.

## Why This Matters
- Prevents users from seeing controls that are not required for MVP outcomes.
- Reduces operational noise and keeps product experience focused.

## Scope
- Remove `/analytics/operations` from navigation and user journeys.
- Remove links/buttons/shortcuts that open operations workflow.
- Keep internal ETL status visibility that supports MVP monitoring only.

## Acceptance Criteria
- No UI path exposes operations retry/replay/backfill workflow in MVP.
- Existing core flows (upload, COGS, matrix, heatmap, attribution) remain intact.

## Deliverables
- UI route and nav cleanup changes.

## Dependencies
- Story 134.
