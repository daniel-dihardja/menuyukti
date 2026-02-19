# Story PWS-02: Folder Structure and Path Resolution Rules

## Story Metadata
- Created Date: 2026-02-19
- Status: `todo`
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
