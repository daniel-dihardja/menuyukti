# STORY-DC-05: API Contract Migration for Analytics and Agent Routes

## Goal
Move API responses to canonical decision contract shape.

## Scope
- Implement shared typed DTOs
- Migrate target routes (`matrix`, `heatmap`, `pairs`, `scheduler`, agent routes)
- Add contract tests for readiness and failure states

## Deliverables
- Shared DTO types and adapters
- Route response migration to canonical contract
- Contract test coverage for critical routes

## Acceptance Criteria (DoD)
- Target routes expose canonical fields consistently
- Contract tests pass in CI
- Readiness/confidence/evidence fields are present and validated
