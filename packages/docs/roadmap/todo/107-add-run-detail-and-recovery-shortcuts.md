# Story 107: Add run detail and recovery shortcuts

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 104

## Goal
Enable run-level drill-down and direct retry/replay shortcuts from run history rows.

## Why This Matters
- Reduces operational friction between diagnosis and action.
- Makes failure recovery faster and less error-prone.

## Scope
- Add expandable/detail surface per run (error message, timing, run identifiers).
- Add shortcut actions:
  - retry from failed run
  - replay from selected run
- Preserve existing guardrails/idempotency behavior.

## Acceptance Criteria
- Failed runs provide one-click retry initiation path.
- Any run can be used as replay source via UI shortcut.
- Shortcut requests produce valid operation records.

## Deliverables
- Run-detail UI + shortcut action handlers.
- Integration updates for operation API calls.

