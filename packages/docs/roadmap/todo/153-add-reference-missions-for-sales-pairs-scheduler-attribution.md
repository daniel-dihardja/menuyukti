# Story 153: Add reference missions for sales, pairs, scheduler, attribution

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Ship reusable mission templates for key product workflows so teams can run autonomous testing immediately.

## Why This Matters
- Reduces setup friction.
- Aligns exploration with highest-value MVP routes and personas.

## Scope
- Create mission templates for:
  - `/analytics/sales` (upload + action menu UX)
  - `/analytics/{id}/pairs` (filters, KPIs, explainability)
  - `/analytics/{id}/scheduler` (state transitions, badges, save/finalize)
  - `/analytics/{id}/attribution` (filters, confidence, export)
- Include expected heuristics and risk focus per mission.

## Acceptance Criteria
- Missions run without manual editing in a seeded local environment.
- Each mission produces findings with route-context tags.
- Templates are versioned and easy to extend.

## Deliverables
- Mission template files + mission catalog index.

## Dependencies
- Story 149.
