# 05. Pair Metrics, Combo Opportunities, and CSV Export

## What This Feature Is About

This feature identifies products frequently bought together, scores combo opportunities, and exports decision-ready tables.

## Pair Metrics Explained

- `support`: how often pair A+B appears across all orders.
- `confidence`: probability of B given A (and vice versa).
- `lift`: strength of association vs random chance.

## Combo Opportunity Scoring

Menuyukti ranks candidate combos using pair strength and margin-aware signals.

## How To Use

1. Load pair metrics (`/api/marts/pair-metrics`) with location/date filters.
2. Review top lift pairs with acceptable sample size.
3. Load combo opportunities (`/api/marts/combo-opportunities`) to rank monetizable bundles.
4. Export for weekly planning via `/api/exports/analyst`:
   - `dataset=matrix`
   - `dataset=pairs`
   - `dataset=combos`

## Example

- Pair `Burger + Iced Tea` has high support and lift.
- Combo score is high due to strong pair behavior and positive margins.
- Team creates a lunchtime bundle promotion and tracks results next cycle.

## Why It Delivers Real Value

- Marketers: better promotion design based on actual co-purchase behavior.
- Analysts: statistically grounded cross-sell logic with reusable exports.

## Good Practice

Ignore very low sample-size pairs (or mark as exploratory) to avoid overfitting decisions to noise.
