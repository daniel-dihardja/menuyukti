# Story 112: Add Neon SQL export script and table allowlist

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 110

## Goal
Export current Neon data into a deterministic SQL seed artifact using an explicit table allowlist.

## Why This Matters
- Prevents accidental export of unwanted/sensitive tables.
- Keeps seed snapshots stable and reproducible across machines.

## Scope
- Add `apps/web/prisma/seed/seed-tables.ts` with ordered allowlist for export.
- Add `apps/web/scripts/export-neon-seed-sql.ts` that:
  - reads `DATABASE_URL`,
  - reads data from allowlisted tables,
  - emits SQL insert statements in FK-safe order,
  - writes output to `apps/web/prisma/seed/export/current_seed.sql`.
- Add npm script: `db:seed:export`.

## Acceptance Criteria
- Export command generates `current_seed.sql` from the active Neon database.
- Output is deterministic in table/row ordering.
- Non-allowlisted tables are excluded.

## Deliverables
- Allowlist config.
- Export script.
- Package script wiring for export command.
