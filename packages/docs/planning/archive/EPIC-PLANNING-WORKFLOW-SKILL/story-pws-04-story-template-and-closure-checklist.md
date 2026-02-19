# Story PWS-04: Story Template and Closure Checklist

## Story Metadata
- Created Date: 2026-02-19
- Status: `done`
- Parent: EPIC-PLANNING-WORKFLOW-SKILL
- Story Points: `3`

## Goal
Create a reusable story template with a strict closure checklist to enforce consistent story quality.

## Why This Matters
- Keeps stories small, testable, and auditable.
- Enforces evidence-first closure discipline.

## Scope
- Define story markdown template for v1.
- Define required “done-state” sections (`Implementation Notes`, `Test Evidence`).
- Define docs-only closure handling (`Test impact: N/A`).
- Add closure checklist usable by both humans and Codex runs.

## Acceptance Criteria
- Story template captures all required v1 story fields.
- Closure checklist enforces archive move + same-commit rule.
- Done-state evidence requirements are explicit.

## Deliverables
- `story-template-v1.md` (or equivalent embedded template section).
- Story closure checklist template.
- One filled example story.

## Implementation Notes
- Added reusable story template:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_STORY_TEMPLATE_V1.md`
- Added story closure checklist:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_STORY_CLOSURE_CHECKLIST_V1.md`
- Added one realistic filled story example:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_STORY_EXAMPLE_V1.md`
- Linked all assets from the epic under `Story Template and Closure Checklist Spec (v1)`:
  - `packages/docs/planning/todo/epic-planning-workflow-skill.md`

## Test Evidence
- Test impact: `N/A` (docs-only story)
