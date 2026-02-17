# Pair Type Contract v1

## Purpose
Define a deterministic pair classification contract for pair/combo analytics:
- `food_food`
- `food_drink`
- `drink_drink`
- `unknown`

This contract is used by marts, APIs, exports, and UI filtering.

## Canonical Menu Class

Each menu item is first mapped to a canonical class:
- `drink`
- `food`
- `unknown`

### Rule Precedence
1. If normalized category/detail contains beverage keywords, class = `drink`.
2. If category/detail is missing/empty, class = `unknown`.
3. Otherwise, class = `food`.

### Beverage Keyword Pattern
`drink|beverage|minum|minuman|kopi|coffee|tea|juice|soda|smoothie|mocktail|cocktail`

## Pair Type Rules

Given classes `class_a`, `class_b`:
1. If `class_a == unknown` OR `class_b == unknown` => `pair_type = unknown`
2. Else if both are `drink` => `pair_type = drink_drink`
3. Else if both are `food` => `pair_type = food_food`
4. Else => `pair_type = food_drink`

## Scoring Adjustment Contract

For combo opportunities:
- `pair_type_boost_factor = 1.15` when `pair_type = food_drink`
- `pair_type_boost_factor = 1.00` otherwise
- `pair_type_boost_applied = (pair_type = food_drink)`
- `combo_opportunity_score = base_combo_opportunity_score * pair_type_boost_factor`

## API/Export Fields

Required additive fields:
- `pair_type`
- `base_combo_opportunity_score` (combos)
- `pair_type_boost_factor` (combos)
- `pair_type_boost_applied` (combos)

## Notes
- Contract is deterministic and symmetric to menu order.
- Unknown category quality should be reduced over time via menu taxonomy hardening.
