# STORY-DC-02: Schema Refactor Blueprint (Prisma + SQL)

## Goal
Map current tables and fields to target schema and define migration strategy.

## Scope
- Build current -> target schema mapping matrix
- Define migration sequence and rollback notes
- Decide compatibility approach (dual-read vs adapter)

## Deliverables
- Mapping matrix by table/field
- Migration runbook with ordering
- Compatibility strategy decision record

## Acceptance Criteria (DoD)
- Migration plan reviewed and signed off
- No unresolved ownership conflicts for table/field responsibilities
- Rollback notes documented for high-risk migration steps
