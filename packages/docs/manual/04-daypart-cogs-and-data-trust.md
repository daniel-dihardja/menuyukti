# 04. Daypart Insights, COGS, and Data Trust

## What This Feature Is About

This combines three critical reliability layers:

- Daypart insight for timing decisions.
- COGS management for accurate margin computation.
- Freshness/quality status to judge whether data is safe to act on.

This page is designed to answer two questions quickly:
- Marketer: "When should I promote which items this week?"
- Analyst: "How much can I trust this recommendation and where is the margin risk?"

## Where To Find It

- Daypart heatmap: `/analytics/{analyticsId}/heatmap`
- COGS management: `/analytics/{analyticsId}/cogs`

## How To Use

1. Open `/analytics/{analyticsId}/heatmap` and review:
   - marketer focus (peak/weak windows + menu focus)
   - analyst focus (underperforming windows + concentration risk + bias)
2. Apply heatmap filters:
   - menu search
   - top rows
   - weekday/weekend segmentation
   - sort by total demand or selected window
3. Export filtered heatmap context when needed via **Export Heatmap CSV**.
4. Open `/analytics/{analyticsId}/cogs` and fill missing or inaccurate COGS.
   - review COGS completeness KPI cards (item coverage and revenue coverage)
   - prioritize updates from the missing/invalid COGS watchlist
5. On decision pages, verify:
   - quality status (`passed`, `warn`, `failed`)
   - freshness age vs SLA

## COGS Completeness Features You Should Use

- KPI cards:
  - total menu items
  - valid COGS items
  - item coverage %
  - revenue coverage %
- Priority watchlist:
  - lists missing/invalid COGS items by highest revenue impact first.
- Matrix readiness context:
  - matrix/export now includes COGS readiness (`ready`, `degraded`, `blocked`) based on coverage thresholds.

## Heatmap Features You Should Use

- Persona insights:
  - marketer card highlights high-opportunity daypart windows and top candidates.
  - analyst card highlights concentration risk, weak windows, and optimization signals.
- Trust and confidence signals:
  - readiness badges and confidence cues show whether recommendations are safe to execute.
- Explainability and method notes:
  - each recommendation is paired with deterministic reason context.
  - method notes clarify that heatmap metrics are aggregate observations, not forecasts.
- Segmentation controls:
  - weekday/weekend segmentation helps align promotions with real customer behavior.
  - top-row and search filters reduce noise for large menus.

## How To Read Trust Status

- `passed` + fresh data:
  - safe default for weekly execution.
- `warn` or stale:
  - use as planning input, but keep decisions review-based.
- `failed`:
  - treat outputs as unreliable, fix data quality first.

## Example

- Lunch window has strongest demand for bundle candidates.
- You schedule Instagram content in the lunch slot rather than evening.
- You update missing COGS for top sellers and margin-based action quality improves.

## Why It Delivers Real Value

- Marketers: better post timing increases chance of conversion.
- Analysts: better cost completeness means fewer misleading profitability signals.

## Decision Rule

If quality is `warn/failed` or freshness is stale, treat recommendations as lower confidence and rerun ingestion when possible.

## Practical Notes

- Heatmap insights are deterministic aggregates, not predictions.
- If readiness is `blocked`, do not finalize campaign timing decisions from this snapshot.
- Exported heatmap CSV should be treated as a snapshot for that filter/time context.
- Treat `degraded/blocked` COGS readiness as a signal to fix cost coverage before pricing/margin actions.
