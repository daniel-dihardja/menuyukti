# Story 118: Add validation for attribution currency rendering

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 116

## Goal
Add automated validation so attribution KPI cards keep using DB-driven currency in future changes.

## Why This Matters
- Prevents regressions back to hardcoded currency symbols.
- Protects release quality for marketer/analyst financial KPIs.

## Scope
- Add test/e2e assertion for attribution KPI currency rendering.
- Validate at least one non-USD currency scenario from seeded/dev data.
- Confirm page still renders KPI cards when currency metadata is missing (fallback path).

## Acceptance Criteria
- Automated check fails if hardcoded `$` returns in Avg Delta Revenue KPI.
- Automated check verifies currency output comes from location currency metadata.

## Deliverables
- New/updated test coverage (unit/integration/e2e based on existing pattern).
