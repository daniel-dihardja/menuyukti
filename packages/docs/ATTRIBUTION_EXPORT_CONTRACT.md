# Attribution Export Contract (v1)

## Purpose

Define a stable CSV contract for Instagram attribution analyst exports, including trust metadata and confidence tuning context.

## Endpoint

- `GET /api/exports/analyst?dataset=attribution&analyticsId=<id>[&from=YYYY-MM-DD][&to=YYYY-MM-DD][&limit=500][&minActiveDays=2][&minCoverageRatio=0.67]`

## Required Query Params

- `dataset=attribution`
- `analyticsId` (integer)

## Optional Query Params

- `from` / `to`: attribution publish window filter
- `limit`: max exported rows (default `500`, max `2000`)
- `minActiveDays`: confidence policy threshold (default `2`)
- `minCoverageRatio`: confidence policy threshold in `[0.1, 1]` (default `0.67`)

## Response

- Content-Type: `text/csv; charset=utf-8`
- Filename pattern: `analyst-attribution-<analyticsId>.csv`

## Column Order (Stable)

1. `dataset`
2. `generated_at`
3. `analytics_id`
4. `location_id`
5. `period_start`
6. `period_end`
7. `from`
8. `to`
9. `export_limit`
10. `quality_status`
11. `freshness_minutes`
12. `is_stale`
13. `min_active_days`
14. `min_coverage_ratio`
15. `instagram_post_id`
16. `campaign_id`
17. `published_at`
18. `canonical_menu_name`
19. `attribution_window_days`
20. `pre_active_days`
21. `post_active_days`
22. `pre_qty`
23. `post_qty`
24. `delta_qty`
25. `pre_revenue`
26. `post_revenue`
27. `delta_revenue`
28. `pre_margin`
29. `post_margin`
30. `delta_margin`
31. `source_confidence`
32. `confidence`
33. `confidence_downgraded`
34. `confidence_reasons` (`|`-separated deterministic reason codes)
35. `coverage_ratio`

## Confidence Reason Codes

- `low_pre_active_days`
- `low_post_active_days`
- `low_coverage_ratio`
- `quality_failed`
- `freshness_stale`
- `quality_warn`

## Compatibility Notes

- Existing columns are append-only for backward-compatible evolution.
- New columns must be appended at the end with contract version notes.
- Existing column semantics and order are immutable for `v1`.
