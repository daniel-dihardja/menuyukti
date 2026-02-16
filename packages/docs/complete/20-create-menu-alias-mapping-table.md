# Story 20: Create Menu Alias Mapping Table

## Goal
Prevent split metrics caused by menu naming variations.

## Scope
- Add `menu_alias` mapping table (`alias_name` -> `canonical_menu_name`).
- Apply alias mapping during clean-to-warehouse transform.
- Keep original menu text for traceability.

## Acceptance Criteria
- Known aliases resolve to one canonical menu identity.
- Matrix and KPI aggregates no longer split alias variants.
- Alias mapping changes are auditable.

## Deliverables
- Schema migration for alias table.
- Transform logic update for alias resolution.

## Status
`complete`
