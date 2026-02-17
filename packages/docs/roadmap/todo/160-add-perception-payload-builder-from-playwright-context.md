# Story 160: Add perception payload builder from Playwright context

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 156

## Goal
Build a context snapshot extractor that gives planner enough page understanding to pick the next action.

## Why This Matters
- Autonomous planning quality depends on good perception input.

## Scope
- Extract and normalize page context:
  - URL/title
  - interactive elements (role/text/selector hint)
  - form controls and state
  - runtime signals (console/network errors)
  - latest screenshot artifact path
- Add payload size guardrails to keep token usage bounded.

## Acceptance Criteria
- Perception payload is deterministic and serializable.
- Planner receives complete context for route-level decisions.

## Deliverables
- Perception builder module integrated with adapter/runner foundation.
