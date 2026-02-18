# STORY-DC-03: Implement Schema Migrations and Compatibility Layer

## Goal
Implement target schema and compatibility adapters without breaking existing routes.

## Scope
- Apply Prisma schema updates and SQL migrations
- Add read adapters for legacy payload compatibility
- Add any required backfill scripts

## Deliverables
- Migration files and schema updates
- Compatibility adapter implementation
- Backfill scripts with idempotency behavior

## Acceptance Criteria (DoD)
- Migrations apply on fresh and existing databases
- Existing route behavior is preserved during transition
- Backfill can be rerun safely without data corruption
