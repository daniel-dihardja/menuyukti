# Story PWS-06: Command Playbook and Commit Conventions

## Story Metadata
- Created Date: 2026-02-19
- Status: `done`
- Parent: EPIC-PLANNING-WORKFLOW-SKILL
- Story Points: `3`

## Goal
Define operational command conventions for planning workflow execution and closure commits.

## Why This Matters
- Makes day-to-day workflow fast and repeatable.
- Reduces inconsistent commit patterns.

## Scope
- Define standard command sequence for:
  - create/refine epic
  - generate stories
  - implement story
  - close story
  - close epic
- Define commit message conventions for each stage.
- Define required file move + commit bundling rules.

## Acceptance Criteria
- Command playbook is complete and runnable.
- Commit conventions are explicit with examples.
- Closure command sequence prevents partial/invalid closes.

## Deliverables
- Command playbook section.
- Commit naming convention table.
- Example closure command transcript.

## Implementation Notes
- Added command playbook covering epic refine, story generation, story close, and epic close:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_COMMAND_PLAYBOOK_V1.md`
- Included commit convention table and closure transcript example.
- Linked playbook from epic under `Command Playbook and Commit Convention Spec (v1)`:
  - `packages/docs/planning/todo/epic-planning-workflow-skill.md`

## Test Evidence
- Test impact: `N/A` (docs-only story)
