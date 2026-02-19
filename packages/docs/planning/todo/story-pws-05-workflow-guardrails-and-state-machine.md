# Story PWS-05: Workflow Guardrails and State Machine

## Story Metadata
- Created Date: 2026-02-19
- Status: `todo`
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
