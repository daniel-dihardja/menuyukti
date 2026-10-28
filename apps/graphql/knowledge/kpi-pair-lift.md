---
title: Pair lift index
category: kpi
slug: kpi-pair-lift
chart_ids: pair_lift_matrix_heatmap
---

# Pair lift index

Pair lift measures how often two menu items are purchased together relative to
chance. A lift above 1.0 means the items co-occur more than independently; higher
lift indicates a stronger combo signal.

## How to use it

- Feature high-lift pairs in posts, combos, and upsell prompts.
- Combine with venue slot strength so combo offers land in strong day × meal slots.
- Do not invent lift numbers — load `pair_lift_matrix_heatmap` via chart tools.

## Caveats

- Rare items can show noisy lift; prefer pairs with meaningful co-purchase counts.
- Lift is not causation; validate with kitchen capacity and margin.
