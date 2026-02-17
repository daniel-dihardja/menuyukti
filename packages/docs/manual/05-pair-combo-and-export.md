# 05. Pair Metrics, Combo Opportunities, and CSV Export

## What This Feature Is About

This feature identifies products frequently bought together, ranks combo opportunities, and provides export-ready analyst data.
The main user workflow is the GUI page:
- `/analytics/{analyticsId}/pairs`

It supports two decision modes:
- Marketer mode: find campaign-ready bundles (especially `food_drink`) for Instagram offers.
- Analyst mode: validate statistical strength and margin impact before rollout.

## Pair Metrics Explained

- `support`: how often pair A+B appears across all orders.
- `confidence`: probability of B given A (and vice versa).
- `lift`: strength of association vs random chance.

Practical interpretation:
- high `support` + high `lift` usually indicates stable and meaningful demand coupling.
- high `confidence` with low `support` can be directional but weak; review sample size.
- `lift` near `1.0` suggests limited incremental association.

## Combo Opportunity Scoring

Menuyukti ranks candidate combos using:
- pair strength (`support`, `confidence`, `lift`)
- margin contribution (`margin_score`)
- pair-type adjustment (food+drink receives a campaign-readiness boost)

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

## What You See In The GUI

- **Top Pair Menu Items** table:
  - Pair, Orders, Support, Confidence, Lift, Score, Pair Type, Quality
- **Top Combo Opportunities** table:
  - Candidate pair, Orders, Lift, Margin Score, Opportunity Score, Confidence, Pair Type
- **Explain** drawer:
  - Base score
  - Pair-type boost applied/not applied
  - Final combo opportunity score

## Filter and Sort Guidance

- `Min sample size`:
  - increase for conservative strategy.
  - decrease for exploratory discovery.
- `Min lift`:
  - use >= `1.0` to avoid random/no-association pairs.
- `Min confidence`:
  - use >= `0.1` for early screening; tighten for production decisions.
- `Sort by`:
  - choose opportunity score for campaign prioritization.
  - choose lift when validating association strength first.

## How To Use

1. Open `/analytics/{analyticsId}/pairs`.
2. Set thresholds:
   - `Min sample size`: start from 5-10 to reduce noise.
   - `Min lift`: start from 1.0 to keep non-random associations.
   - `Min confidence`: start from 0.1-0.2 for practical attachment behavior.
3. Set `Pair type`:
   - choose `food_drink` for marketer upsell campaigns.
4. Review top rows and open **Explain** for rationale.
5. Export for weekly planning via `/api/exports/analyst`:
   - `dataset=matrix`
   - `dataset=pairs`
   - `dataset=combos`

## Export Workflow

- Export only after applying final filter thresholds.
- Keep a weekly versioned file (e.g. `week-2026-07-pairs.csv`) for trend comparison.
- Share filtered URLs together with CSV files to preserve decision context.

## Example

- Pair `Burger + Iced Tea` has high support and lift.
- Pair type is `Food + Drink`, so combo score can include pair-type boost.
- Team creates a lunchtime bundle promotion and tracks results next cycle.
- Analyst keeps a second view for `food_food` to monitor cross-sell without drink dependency.

## Why It Delivers Real Value

- Marketers: better promotion design based on actual co-purchase behavior.
- Analysts: statistically grounded cross-sell logic with reusable exports.

## Good Practice

Ignore very low sample-size pairs (or mark as exploratory) to avoid overfitting decisions to noise.
Use `food_drink` as primary marketer workflow, then review other pair types for analyst-only opportunities.
