# Story 111: Wire Prisma `db seed` command and seed runner

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 110

## Goal
Add Prisma-native seed wiring so `pnpm -C apps/web run db:seed` works consistently in local workflows.

## Why This Matters
- Makes the seed flow compatible with Prisma CLI (`prisma db seed`, `prisma migrate reset`).
- Removes ambiguity about how seed scripts are invoked.

## Scope
- Add `db:seed` script in `apps/web/package.json` that calls `prisma db seed`.
- Add Prisma seed config in `apps/web/package.json`:
  - `"prisma": { "seed": "tsx scripts/seed-from-sql.ts" }`.
- Add base seed runner script at `apps/web/scripts/seed-from-sql.ts`.

## Acceptance Criteria
- `pnpm -C apps/web run db:seed` executes without missing command/config errors.
- `prisma migrate reset --force` can invoke the configured seed hook.

## Deliverables
- `apps/web/package.json` updates.
- `apps/web/scripts/seed-from-sql.ts` (initial runnable seed runner).
