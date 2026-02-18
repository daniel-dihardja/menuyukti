# STORY-DC-06: UI Refactor by Surface (No Route Removal)

## Goal
Adapt retained analytics pages to canonical contracts without removing any route.

## Scope
- Migrate UI data consumption for matrix, heatmap, pairs, scheduler, attribution/related views
- Preserve current user journeys and filtering behavior

## Deliverables
- Updated page-level adapters/selectors
- Canonical contract integration across decision surfaces
- UX parity checks for core workflows

## Acceptance Criteria (DoD)
- Each retained page renders correctly using canonical contract data
- Existing user workflows remain functional
- No route removals or regressions in critical navigation flows
