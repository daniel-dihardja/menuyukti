# Story 117: Use location currency for attribution KPI values

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 116

## Goal
Replace hardcoded `$` in attribution KPI cards (including Avg Delta Revenue) with location currency from DB.

## Why This Matters
- Attribution impact values must reflect real business currency per branch.
- Prevents interpretation errors in weekly campaign reviews.

## Scope
- Read `currency_code` from location/branch linked to the current analytics record.
- Apply currency-aware formatting to KPI cards on:
  - `/analytics/{analyticsId}/attribution`
- Keep existing number precision semantics while changing currency symbol/code source.
- Add deterministic fallback when currency code is missing (for example: `IDR` default from DB contract).

## Acceptance Criteria
- Avg Delta Revenue no longer shows hardcoded `$`.
- Currency in attribution KPI cards matches `branches.currency_code`.
- Formatting behavior is deterministic for null/missing currency values.

## Deliverables
- Attribution page formatting update.
- Shared/utility formatter update if needed.
