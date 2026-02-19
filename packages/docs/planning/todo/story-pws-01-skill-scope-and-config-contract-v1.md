# Story PWS-01: Skill Scope and Config Contract v1

## Story Metadata
- Created Date: 2026-02-19
- Status: `todo`
- Parent: EPIC-PLANNING-WORKFLOW-SKILL
- Story Points: `3`

## Goal
Define the minimum config contract for the `planning-workflow` skill so it can run in different repositories.

## Why This Matters
- Prevents hard-coding menuyukti-specific paths.
- Ensures the skill is reusable and predictable across projects.

## Scope
- Define required config keys (root planning path, todo path, archive path).
- Define optional config keys (epic/story naming variants, blueprint/spec filenames).
- Define default values when config is omitted.
- Define validation rules for missing/invalid config.
- Document default root recommendation: `docs/planning/` at repository root.

## Acceptance Criteria
- Skill config contract is documented in v1 form.
- Required vs optional keys are explicit.
- Defaults and validation behavior are explicit and testable.
- Default planning path recommendation (`docs/planning/`) is explicitly documented.

## Deliverables
- Config contract spec document section in epic/skill docs.
- Example config snippet (`minimal` and `full`).
- Validation checklist for config inputs.
