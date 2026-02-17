# Story 110: Add Neon DB seed and SQL export workflow

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Enable a repeatable local database bootstrap flow with:
- `db:reset`
- `db:gen`
- `db:seed`

The seed data must come from current Neon data and be reproducible from SQL export artifacts.

## Why This Matters
- Keeps local/dev environments aligned with realistic production-like data.
- Reduces setup time and onboarding friction.
- Provides deterministic recovery for analytics/testing after schema updates.

## Scope
- Add Prisma seed configuration (`package.json` -> `"prisma"."seed"`) and script for local reseeding.
- Add a SQL export script to snapshot current Neon data into repository-managed artifacts.
- Add documented workflow for generating and applying seed exports.
- Keep exported data safe (no secrets), deterministic, and idempotent.

## Implementation Details
1. Add `db:seed` script in `apps/web/package.json` that calls `prisma db seed`, plus Prisma seed configuration:
   - `"prisma": { "seed": "tsx scripts/seed-from-sql.ts" }`.
2. Add an export utility script (`apps/web/scripts/export-neon-seed-sql.ts`) that:
   - reads `DATABASE_URL`,
   - connects to Neon-compatible Postgres,
   - exports insert statements for selected tables in dependency-safe order,
   - writes SQL to `apps/web/prisma/seed/export/current_seed.sql`.
3. Add a seed runner script (`apps/web/scripts/seed-from-sql.ts`) that:
   - reads SQL from `apps/web/prisma/seed/export/current_seed.sql`,
   - executes statements transactionally (or in safe chunks) via Prisma-compatible execution path,
   - reports row and table counts.
4. Add table allowlist config (`apps/web/prisma/seed/seed-tables.ts`) to control what is exported/seeded.
5. Add reset-safe semantics:
   - `TRUNCATE ... RESTART IDENTITY CASCADE` for seeded tables before inserts.
   - deterministic ordering and conflict behavior (`ON CONFLICT DO NOTHING` where needed).
6. Add documentation:
   - command flow (`db:reset -> db:gen -> db:init -> db:seed`),
   - how to refresh SQL export from current Neon,
   - safeguards for sensitive data exclusion.

## Acceptance Criteria
- `pnpm -C apps/web run db:seed` works after `db:init` and populates expected tables.
- SQL export can be regenerated from current Neon DB with one command.
- Seed workflow is documented and reproducible by another developer.
- Seed output is deterministic enough for E2E/dev bootstrapping.

## Workflow Notes
- `db:reset` already reapplies migrations and triggers Prisma seed automatically.
- Recommended routine:
  - schema change path: `db:gen -> db:init -> db:seed`
  - full reset path: `db:reset` (seed runs automatically)

## Deliverables
- `db:seed` script wiring and Prisma seed config.
- SQL export script + seed execution script.
- Seed table allowlist config.
- Seed SQL artifact path and usage docs.
