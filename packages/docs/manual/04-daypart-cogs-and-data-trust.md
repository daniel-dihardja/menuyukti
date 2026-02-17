# 04. Daypart Insights, COGS, and Data Trust

## What This Feature Is About

This combines three critical reliability layers:

- Daypart insight for timing decisions.
- COGS management for accurate margin computation.
- Freshness/quality status to judge whether data is safe to act on.

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
5. On decision pages, verify:
   - quality status (`passed`, `warn`, `failed`)
   - freshness age vs SLA

## Example

- Lunch window has highest demand for combo candidates.
- You schedule Instagram content 11:00-13:00 instead of evening.
- You update missing COGS for two top sellers and margin recommendations become more accurate.

## Why It Delivers Real Value

- Marketers: better post timing increases chance of conversion.
- Analysts: better cost completeness means fewer misleading profitability signals.

## Decision Rule

If quality is `warn/failed` or freshness is stale, treat recommendations as lower confidence and rerun ingestion when possible.

## Practical Notes

- Heatmap insights are deterministic aggregates, not predictions.
- If readiness is `blocked`, do not finalize campaign timing decisions from this snapshot.
