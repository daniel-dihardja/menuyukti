# Story 02: Create Layered Schemas (`staging`, `warehouse`, `marts`)

## Goal
Introduce schema-layer separation for ETL and analytics workloads while keeping app-serving tables intact.

## Scope
- Create logical DB namespaces:
  - `staging`
  - `warehouse`
  - `marts`
- Keep existing Prisma operational schema unchanged during transition.

## Acceptance Criteria
- Schemas are created and accessible.
- No existing app endpoint behavior is broken.
- Migration scripts are idempotent.

## Deliverables
- Migration files for schema creation.
- Environment/config notes for schema access.

## Status
`todo`
