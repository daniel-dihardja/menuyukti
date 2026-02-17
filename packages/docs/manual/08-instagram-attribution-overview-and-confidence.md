# 08. Instagram Attribution Overview and Confidence Tuning

## What This Feature Is About

This feature shows observed before/after sales outcomes for promoted menu items linked to Instagram posts.
Main workflow page:
- `/analytics/{analyticsId}/attribution`

It helps teams answer:
- Marketer: "Did this post create real sales lift?"
- Analyst: "How confident should we be in this attribution signal?"

## What You See On The Page

- Attribution KPI cards:
  - unique posts
  - promoted items
  - positive revenue rows
  - average delta revenue
- Currency behavior:
  - money KPIs and `delta revenue` values follow the branch/location currency from DB (`branches.currency_code`)
  - no hardcoded `$` symbol is used for attribution money values
  - if currency metadata is missing/empty, fallback currency is `IDR`
- Attribution outcome table:
  - post and campaign identity
  - promoted menu item
  - pre/post qty and delta qty
  - delta revenue
  - confidence (source vs tuned)
  - attribution window and coverage indicator

## Confidence Tuning Controls

You can tune confidence policy directly on the page:
- `Min active days`
- `Min coverage ratio`

These controls downgrade confidence when sample quality is weak.
Quality/freshness readiness can also downgrade or block confidence.

## How To Use

1. Open `/analytics/{analyticsId}/attribution`.
2. Review KPI cards for top-level outcome direction.
3. Scan rows with positive/negative `delta revenue`.
4. Check confidence badges and reason labels before making decisions.
5. Tune `Min active days` and `Min coverage ratio` for stricter interpretation.
6. Re-check rows that changed confidence after tuning.

## Scheduler Linkage

- Scheduler rows with linked post IDs can open filtered attribution view.
- Use this to validate whether scheduled/published content produced observed uplift.

## Export

Use analyst export API for reporting:
- `GET /api/exports/analyst?dataset=attribution&analyticsId=<id>`
- Optional params:
  - `from`
  - `to`
  - `limit`
  - `minActiveDays`
  - `minCoverageRatio`

## Why It Delivers Real Value

- Marketers: campaign planning can be prioritized by measured outcomes, not assumptions.
- Analysts: confidence-aware interpretation reduces false positives from weak samples.

## Practical Decision Rules

- Prioritize rows with positive deltas and stable/high confidence.
- Treat downgraded rows as review candidates, not immediate rollout signals.
- If quality is `failed`, treat attribution outcomes as blocked until pipeline health recovers.
