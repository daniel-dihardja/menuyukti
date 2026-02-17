# Story 94: Extend analyst export with COGS completeness fields

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 92

## Goal
Add stable COGS completeness fields to analyst export workflows for reporting and auditability.

## Why This Matters
- Weekly analyst reporting needs data-quality context, not only decision outputs.
- Export parity keeps offline review aligned with UI trust indicators.

## Scope
- Extend export datasets with COGS completeness metadata where applicable.
- Include missing/invalid COGS flags and coverage context.
- Keep column stability and document contract updates.

## Acceptance Criteria
- Analyst export includes COGS completeness columns with deterministic meanings.
- Column changes are documented in contract docs.
- Export tests validate headers and key values.

## Deliverables
- Export route updates.
- Contract documentation updates.
- Tests for schema and sample values.

