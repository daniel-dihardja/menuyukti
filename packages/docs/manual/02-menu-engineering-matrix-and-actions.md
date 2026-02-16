# 02. Menu Engineering Matrix and Actions

## What This Feature Is About

The matrix is the main decision page for item-level performance. It combines sales and cost signals to classify menu items and suggest actions.

## Core Metrics You See

- Units sold
- Revenue
- COGS
- Contribution margin
- Margin percentage
- Recommended action + explainability reason

## Action Meanings

- `promote`: strong margin potential, needs stronger demand.
- `improve/reprice`: demand exists but margin is weak.
- `remove`: weak demand and weak margin.
- `keep`: strong baseline performance.

## How To Use

1. Open `/analytics/{analyticsId}/matrix`.
2. Sort by `Revenue` or `Margin %` based on your objective.
3. Review action badge and action reason per item.
4. Build a weekly plan from top candidates.

## Example Decisions

- Item `Iced Latte`: `promote` with high margin -> run Instagram push campaign.
- Item `Chicken Bowl`: `improve/reprice` with low margin -> adjust pricing or portion/cost.
- Item `Old Seasonal Drink`: `remove` with low demand and low margin -> phase out.

## Why It Delivers Real Value

- Marketers: quickly convert item data into campaign priorities.
- Analysts: get deterministic, explainable action lists for weekly operations.

## Good Practice

Always read action together with reason and freshness/quality indicators before executing changes.
