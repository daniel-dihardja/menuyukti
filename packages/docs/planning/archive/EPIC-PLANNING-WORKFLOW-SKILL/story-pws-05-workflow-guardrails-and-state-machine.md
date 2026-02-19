# Story PWS-05: Workflow Guardrails and State Machine

## Story Metadata
- Created Date: 2026-02-19
- Status: `done`
- Parent: EPIC-PLANNING-WORKFLOW-SKILL
- Story Points: `5`

## Goal
Define enforceable workflow guardrails and state transitions for epic/story lifecycle.

## Why This Matters
- Prevents process drift (for example completed stories left in `todo`).
- Standardizes behavior across users and projects.

## Scope
- Define story state machine (`todo -> in_progress -> done`).
- Define epic state machine (`Draft -> In Progress -> Done`).
- Define guardrails:
  - single story implementation focus
  - no close without acceptance evidence
  - archive move required for closure
- Define exception handling (blocked story, rollback, reopened story).

## Acceptance Criteria
- State transitions are documented and unambiguous.
- Guardrails are explicit, enforceable, and reusable.
- Exception paths are documented with required actions.

## Deliverables
- Workflow state machine documentation.
- Guardrail policy checklist.
- Example lifecycle trace for one story and one epic.

## Implementation Notes
- Added workflow state machine spec:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_STATE_MACHINE_V1.md`
- Added guardrails policy and enforcement checklist:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_GUARDRAILS_POLICY_V1.md`
- Added lifecycle trace examples for one story and one epic:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_LIFECYCLE_TRACE_EXAMPLE_V1.md`
- Linked these assets from the epic under `Workflow Guardrails and State Machine Spec (v1)`:
  - `packages/docs/planning/todo/epic-planning-workflow-skill.md`

## Test Evidence
- Test impact: `N/A` (docs-only story)
