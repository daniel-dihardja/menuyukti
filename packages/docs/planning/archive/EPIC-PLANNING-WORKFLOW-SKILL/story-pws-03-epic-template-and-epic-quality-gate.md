# Story PWS-03: Epic Template and Epic Quality Gate

## Story Metadata
- Created Date: 2026-02-19
- Status: `done`
- Parent: EPIC-PLANNING-WORKFLOW-SKILL
- Story Points: `3`

## Goal
Create a reusable epic template and quality gate for epic readiness before story generation.

## Why This Matters
- Ensures stories are generated from complete, actionable epics.
- Reduces ambiguity and rework during implementation.

## Scope
- Define epic markdown template for v1.
- Add mandatory sections checklist for epic completeness.
- Define “epic ready” criteria before creating stories.
- Add one realistic filled example epic.

## Acceptance Criteria
- Epic template includes all required v1 fields.
- Readiness checklist is explicit and reusable.
- Example epic can be used as a reference without additional assumptions.

## Deliverables
- `epic-template-v1.md` (or equivalent embedded template section).
- Epic quality gate checklist.
- One filled example epic.

## Implementation Notes
- Added reusable epic template:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_EPIC_TEMPLATE_V1.md`
- Added epic quality gate checklist:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_EPIC_QUALITY_GATE_V1.md`
- Added one realistic filled epic example:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_EPIC_EXAMPLE_V1.md`
- Linked all assets from the epic under `Epic Template and Quality Gate Spec (v1)`:
  - `packages/docs/planning/todo/epic-planning-workflow-skill.md`

## Test Evidence
- Test impact: `N/A` (docs-only story)
