# Analyst Matrix Export Contract (v1.1)

## Purpose

Define stable CSV fields for matrix analyst exports, including COGS completeness indicators required for trustworthy profitability analysis.

## Endpoint

- `GET /api/exports/analyst?dataset=matrix&analyticsId=<id>[&filters...]`

## COGS Completeness Fields (Added in v1.1)

- `has_valid_cogs` (`true|false`)
  - `true` when row-level COGS value is present and > 0.
- `cogs_issue` (`none|missing|invalid`)
  - `missing`: row has `null` COGS.
  - `invalid`: row has non-null COGS but fails validity check (`<= 0`).
  - `none`: valid COGS.
- `cogs_item_coverage_ratio` (`0..1`)
  - valid-COGS item count / filtered export item count.
- `cogs_revenue_coverage_ratio` (`0..1`)
  - revenue from valid-COGS rows / total filtered export revenue.

## Compatibility Notes

- Existing columns remain unchanged.
- New fields are appended for backward-compatible evolution.
