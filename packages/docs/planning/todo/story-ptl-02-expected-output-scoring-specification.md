# Story PTL-02: Expected Output Scoring Specification

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `3`

## Goal
Define and lock the pilot scoring specification before any prompt iteration is executed.

## Why This Matters
- Makes prompt effectiveness objective and repeatable.
- Prevents post-hoc rubric changes that bias outcomes.

## Scope
- Define weighted dimensions and pass threshold (`>= 80`).
- Define critical fail conditions (`invalid_json`, `missing_required_field`).
- Define baseline improvement and regression guard rules.
- Define deterministic scoring policy and artifact fields.

## Acceptance Criteria
- Scoring spec has version id and is persisted as a file.
- Binary vs rubric dimensions are explicitly labeled.
- Stop/fail conditions are explicit, including max-iteration behavior.
- Scoring spec is referenced by evaluation runner implementation docs.
- Scoring spec explicitly states that only mocked input fixtures are valid for this pilot.

## Deliverables
- Versioned scoring spec artifact.
- Scoring rubric notes with examples.
- Scoring policy references for implementation use.
