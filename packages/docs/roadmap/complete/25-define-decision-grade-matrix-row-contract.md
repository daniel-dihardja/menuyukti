# Story 25: Define Decision-Grade Matrix Row Contract

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Create a single canonical matrix row contract that is decision-grade for restaurant marketers and menu analysts.

## Why This Matters
- Marketers need reliable, comparable item metrics to decide promotion priorities.
- Menu analysts need consistent profitability fields to avoid misclassification.

## Scope
- Define one normalized row model for matrix rendering.
- Standardize field semantics: `menuItem`, `category`, `unitsSold`, `revenue`, `cogs`, `contributionMargin`, `marginPct`, `action`, `actionReason`.
- Define null/invalid handling rules for COGS and margin fields.

## Data Engineering Requirements
- Contract is versioned and backward-compatible for the UI read path.
- Numeric normalization and rounding are deterministic.
- Explicit provenance field for action reasoning inputs.

## Acceptance Criteria
- One shared mapper powers matrix row generation.
- Contract tests validate schema and null-handling behavior.
- `actionReason` is business-readable and tied to concrete row metrics.

## Deliverables
- Canonical matrix row type + mapper utility.
- Contract test coverage for edge cases.
