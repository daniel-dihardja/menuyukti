# Story PWS-02: Folder Structure and Path Resolution Rules

## Story Metadata
- Created Date: 2026-02-19
- Status: `done`
- Parent: EPIC-PLANNING-WORKFLOW-SKILL
- Story Points: `3`

## Goal
Formalize path resolution behavior so the skill always finds the correct planning folders and archive targets.

## Why This Matters
- Avoids misplaced files and broken archive flows.
- Keeps behavior deterministic when repositories use custom planning roots.

## Scope
- Define canonical directory expectations for v1.
- Define path resolution order (explicit config first, then defaults).
- Define behavior when required folders are missing (create vs fail policy).
- Define archive folder naming and path normalization rules.

## Acceptance Criteria
- Path resolution logic is documented step-by-step.
- Missing-folder behavior is explicit.
- Archive target path is deterministic for all stories/epics.

## Deliverables
- Path resolution rules section in skill docs.
- Folder existence/creation policy.
- Worked examples for default and custom project paths.

## Implementation Notes
- Added dedicated path resolution blueprint:
  - `packages/docs/planning/blueprints/PLANNING_WORKFLOW_PATH_RESOLUTION_V1.md`
- Documented:
  - canonical directory expectations
  - resolution order (config -> derived -> defaults)
  - path normalization and traversal safety rules
  - missing-folder policy with `allow_auto_create_dirs`
  - deterministic archive target rules for story/epic closure
  - worked examples (default and custom planning roots)
- Linked the new v1 path resolution spec from the epic:
  - `packages/docs/planning/todo/epic-planning-workflow-skill.md`

## Test Evidence
- Test impact: `N/A` (docs-only story)
