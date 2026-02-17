# Story 160: Add Scheduler Suggestion Rail and Use Suggestion Action

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Expose weekly suggestions in scheduler UI and allow one-click conversion into draft workflow.

## Why This Matters
- Reduces marketer effort from analysis to action.

## Scope
- Add suggestion rail/list in scheduler page.
- Render rationale, menu focus, and recommended timing.
- Add `Use Suggestion` action to prefill composer context.

## Acceptance Criteria
- Scheduler renders suggestion rail for valid analytics/week context.
- `Use Suggestion` opens composer with suggestion fields prefilled.
- UI handles empty suggestion state with clear messaging.
- Responsive layout works on desktop and mobile.

## Deliverables
- Scheduler UI components for suggestion rail.
- Client wiring for suggestion API fetch.
- Prefill state handoff into composer.
