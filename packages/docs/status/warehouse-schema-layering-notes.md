# Warehouse Schema Layering Notes

## Purpose

Provide operational notes for the layered schema rollout:

- `staging`
- `warehouse`
- `marts`

## Migration

- Migration file:
  - `apps/web/prisma/migrations/20260216123000_layered_schemas_init/migration.sql`

## Behavior

1. Existing operational Prisma tables remain unchanged.
2. Layered schemas are created in parallel for ETL/analytics workloads.
3. Migration is idempotent (`CREATE SCHEMA IF NOT EXISTS`).

## Usage Guidance

1. Land raw and normalized ingest outputs into `staging`.
2. Build conformed dimensions and canonical facts in `warehouse`.
3. Expose business-facing marts in `marts`.

## Access Notes

1. Ensure DB role for analytics pipeline has create/read/write on these schemas.
2. Keep serving-layer app queries on operational tables until read cutover stories are completed.
