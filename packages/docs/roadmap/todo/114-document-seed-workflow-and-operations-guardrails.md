# Story 114: Document seed workflow and operations guardrails

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 110

## Goal
Document the end-to-end seed/export workflow so all developers can run it reliably.

## Why This Matters
- Reduces onboarding/setup friction.
- Prevents misuse of export/seed scripts on the wrong database target.

## Scope
- Update roadmap/manual docs with:
  - canonical commands (`db:gen`, `db:init`, `db:seed`, `db:reset`),
  - when `db:reset` already triggers seed automatically,
  - how to regenerate `current_seed.sql` from Neon,
  - safety checks (environment targeting, data sensitivity, allowlist policy).
- Add troubleshooting notes for common failures (missing SQL file, FK order issues, bad env var).

## Acceptance Criteria
- A developer can follow docs and reproduce the seed workflow.
- Docs clearly distinguish schema flow vs full-reset flow.
- Guardrails for production/non-prod environment usage are explicit.

## Deliverables
- Documentation updates in roadmap/manual files.
