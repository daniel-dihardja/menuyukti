# Story 113: Make seed runner idempotent and reset-safe

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 110

## Goal
Ensure seeded SQL can be applied safely and repeatedly in dev without inconsistent states.

## Why This Matters
- Developers frequently reseed during schema and feature iteration.
- Idempotent behavior reduces setup failures and manual cleanup.

## Scope
- Enhance `seed-from-sql.ts` to:
  - load `apps/web/prisma/seed/export/current_seed.sql`,
  - run pre-seed cleanup (`TRUNCATE ... RESTART IDENTITY CASCADE`) for allowlisted tables,
  - apply SQL with clear error reporting,
  - print seeded table/row summary.
- Ensure FK dependency ordering and conflict behavior are respected.

## Acceptance Criteria
- Running `db:seed` multiple times does not produce FK/integrity drift.
- Seed can run after `db:init` and after `db:reset`.
- Errors include actionable table/statement context.

## Deliverables
- Idempotent seed execution logic.
- Seed run summary output.
