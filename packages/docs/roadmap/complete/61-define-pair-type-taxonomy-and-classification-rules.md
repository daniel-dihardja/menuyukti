# Story 61: Define Pair Type Taxonomy and Classification Rules

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Define deterministic pair typing for combo analysis: `food_food`, `food_drink`, `drink_drink`, `unknown`.

## Why This Matters
- Establishes the business contract needed for marketer-grade combo strategy.
- Prevents inconsistent labeling across marts, APIs, and UI.

## Scope
- Define canonical pair-type enum and rule precedence.
- Specify how `menu_category` and `menu_category_detail` are interpreted.
- Define fallback behavior when category data is missing/ambiguous.
- Add examples and edge-case table.

## Acceptance Criteria
- Pair-type taxonomy and rules are documented and unambiguous.
- Edge cases (null/empty/mixed formats) are covered.

## Deliverables
- Pair-type contract markdown in roadmap docs.

