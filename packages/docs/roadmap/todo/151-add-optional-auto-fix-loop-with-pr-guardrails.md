# Story 151: Add optional auto-fix loop with PR guardrails

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Allow the AI workflow to propose code fixes for selected findings and package them safely as reviewable changes.

## Why This Matters
- Converts issue discovery into faster remediation.
- Keeps human approval in control while reducing manual toil.

## Scope
- Add `autofix` mode behind explicit flag.
- Scope auto-fixes to approved categories (UI overflow, tooltip copy, obvious null guards).
- Run validation checks after patch (typecheck, lint, targeted tests).
- Emit PR-ready summary with changed files and risk notes.

## Acceptance Criteria
- Auto-fix runs only when explicitly enabled.
- Failed validations prevent merge-ready output.
- Human-review package is generated for every proposed fix batch.

## Deliverables
- Auto-fix runner mode + validation gate + patch summary output.

## Dependencies
- Stories 149-150.
