# Planning Workflow State Machine v1

## Purpose
Define explicit state transitions for stories and epics to enforce consistent lifecycle behavior.

## Story State Machine

States:
- `todo`
- `in_progress`
- `done`
- `blocked` (exception state)

Allowed transitions:
- `todo -> in_progress`
- `in_progress -> done`
- `in_progress -> blocked`
- `blocked -> in_progress`
- `done -> in_progress` (reopen with explicit reason)

Disallowed transitions:
- `todo -> done` (must pass implementation/evidence workflow)
- `done -> todo` (reopen must go to `in_progress`)

## Epic State Machine

States:
- `Draft`
- `In Progress`
- `Done`
- `Blocked` (exception state)

Allowed transitions:
- `Draft -> In Progress`
- `In Progress -> Done`
- `In Progress -> Blocked`
- `Blocked -> In Progress`
- `Done -> In Progress` (reopen with explicit reason)

Disallowed transitions:
- `Draft -> Done` (stories must be created and completed first)

## Transition Requirements

Story close transition (`in_progress -> done`) requires:
- acceptance criteria satisfied
- implementation notes present
- test evidence present (or docs-only `N/A`)
- story moved from `todo/` to `archive/<EPIC_ID>/`
- code/doc + move included in same commit

Epic close transition (`In Progress -> Done`) requires:
- all epic stories archived
- no remaining open story in `todo/` for that epic
- epic moved from `todo/` to `archive/<EPIC_ID>/`

## Reopen Policy

When reopening a done story/epic:
- set state to `in_progress`
- add reason in notes
- create follow-up commit explaining reopening cause
