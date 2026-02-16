# 05. Pair Metrics, Combo Opportunities, and CSV Export

## What This Feature Is About

This feature identifies products frequently bought together, scores combo opportunities, and exports decision-ready tables.

## Pair Metrics Explained

- `support`: how often pair A+B appears across all orders.
- `confidence`: probability of B given A (and vice versa).
- `lift`: strength of association vs random chance.

## Combo Opportunity Scoring

Menuyukti ranks candidate combos using pair strength and margin-aware signals.

## Pair Type Strategy (Food + Drink Priority)

Menuyukti classifies each pair into:
- `Food + Drink`
- `Food + Food`
- `Drink + Drink`
- `Unknown`

Why this matters:
- `Food + Drink` is usually the highest practical upsell pattern for restaurant marketers.
- It maps cleanly to Instagram campaign mechanics (clear bundle framing and CTA).
- It helps analysts separate cross-sell opportunities from same-category cannibalization patterns.

Combo ranking includes a deterministic pair-type adjustment:
- `Food + Drink` receives a ranking boost for campaign readiness.
- Explainability output shows whether the pair-type boost was applied.

## How To Use

1. Load pair metrics (`/api/marts/pair-metrics`) with location/date filters.
2. Review top lift pairs with acceptable sample size.
3. Load combo opportunities (`/api/marts/combo-opportunities`) to rank monetizable bundles.
4. Use `pairType` filter (`food_drink`, `food_food`, `drink_drink`, `unknown`) to focus analysis.
4. Export for weekly planning via `/api/exports/analyst`:
   - `dataset=matrix`
   - `dataset=pairs`
   - `dataset=combos`

## Example

- Pair `Burger + Iced Tea` has high support and lift.
- Pair type is `Food + Drink`, so combo score can include pair-type boost.
- Team creates a lunchtime bundle promotion and tracks results next cycle.

## Why It Delivers Real Value

- Marketers: better promotion design based on actual co-purchase behavior.
- Analysts: statistically grounded cross-sell logic with reusable exports.

## Good Practice

Ignore very low sample-size pairs (or mark as exploratory) to avoid overfitting decisions to noise.
