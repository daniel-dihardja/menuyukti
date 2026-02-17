# Story 159: Implement LLM planner with structured next-action output

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 156

## Goal
Implement planner service that calls model and returns schema-validated next action.

## Why This Matters
- This is the core autonomy step: choosing actions dynamically from context.

## Scope
- Create planner module using AI SDK structured generation.
- Build planner prompt with mission objective, route context, and safety constraints.
- Return typed output only (no free-form action execution).
- Add fallback behavior for invalid/empty responses.

## Acceptance Criteria
- Planner produces valid action objects for sample context inputs.
- Planner failures return controlled error payloads.

## Deliverables
- Planner service module + validation/fallback logic.
