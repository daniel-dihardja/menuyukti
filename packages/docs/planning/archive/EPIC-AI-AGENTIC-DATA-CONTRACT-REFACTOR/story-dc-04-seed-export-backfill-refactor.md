# STORY-DC-04: Seed/Export/Backfill Refactor

## Goal
Align seed/export pipelines with the refactored schema.

## Scope
- Update `apps/web/prisma/seed/seed-tables.ts`
- Update `apps/web/scripts/seed-from-sql.ts`
- Update `apps/web/scripts/export-neon-seed-sql.ts`
- Add seed creation E2E validator (`apps/web/e2e/seed-creation.e2e.ts`)
- Validate deterministic seed/export behavior

## Deliverables
- Refactored seed table ordering and script logic
- Updated export behavior aligned to new schema
- Smoke-check evidence for seed determinism
- E2E seed creation spec and command (`test:e2e:seed`)

## Acceptance Criteria (DoD)
- `db:seed`, `db:seed:export`, and `db:seed:smoke` pass
- `test:e2e:seed` validates seeded table row counts against `current_seed.sql`
- Seed artifact remains reproducible
- No broken dependencies across seed-scope tables
