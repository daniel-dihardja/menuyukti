# Story 12: Switch Read Paths Gradually

## Goal
Migrate consumer reads from legacy snapshot/json sources to warehouse/marts with minimal risk.

## Scope
- Move BI/reporting endpoints first.
- Then migrate app analytics reads.
- Keep fallback path during cutover window.

## Acceptance Criteria
- Read-path cutovers are feature-flagged or controlled.
- Consumer-facing functionality remains stable.
- Rollback path is tested and documented.

## Deliverables
- Cutover checklist.
- Endpoint-by-endpoint migration map.

## Status
`todo`
