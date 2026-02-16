# Story 65: Add Food+Drink Boost to Combo Scoring

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Increase ranking relevance by boosting `food_drink` pairs in combo opportunity scoring.

## Why This Matters
- Reflects real restaurant upsell behavior (main + beverage).
- Improves marketer-ready recommendations for promotions and bundles.

## Scope
- Add configurable boost factor for `food_drink` pair type.
- Keep base score and existing components visible.
- Preserve deterministic ordering and tie-breakers.

## Acceptance Criteria
- `food_drink` rows receive documented scoring uplift.
- Non-`food_drink` rows keep baseline scoring.

## Deliverables
- Updated scoring logic + configuration support.

