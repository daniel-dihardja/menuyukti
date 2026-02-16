# Story 47: Add Margin-Aware Combo Opportunity Scoring

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Generate deterministic combo opportunities by combining pair strength with margin potential.

## Why This Matters
- Analysts need ranking logic that balances demand and profitability.

## Scope
- Define combo opportunity score using pair metrics + item margin signals.
- Build mart/view with ranked combo candidates per branch.
- Include explainability fields (score components).

## Acceptance Criteria
- Combo score is deterministic and documented.
- Output includes score breakdown fields.
- Top-N combos are queryable via API.

## Deliverables
- Combo scoring SQL/mart + read API.
