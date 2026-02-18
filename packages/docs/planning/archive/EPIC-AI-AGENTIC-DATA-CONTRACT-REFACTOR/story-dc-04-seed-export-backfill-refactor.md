# STORY-DC-04: Seed/Export/Backfill Refactor

## Goal
Align seed/export pipelines with the refactored schema.

## Scope
- Update `apps/web/prisma/seed/seed-tables.ts`
- Update `apps/web/scripts/seed-from-sql.ts`
- Update `apps/web/scripts/export-neon-seed-sql.ts`
- Validate deterministic seed/export behavior

## Deliverables
- Refactored seed table ordering and script logic
- Updated export behavior aligned to new schema
- Smoke-check evidence for seed determinism

## Acceptance Criteria (DoD)
- `db:seed`, `db:seed:export`, and `db:seed:smoke` pass
- Seed artifact remains reproducible
- No broken dependencies across seed-scope tables
