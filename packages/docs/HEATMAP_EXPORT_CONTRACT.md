# Heatmap Export Contract

## Purpose
Define a stable CSV contract for heatmap analyst exports, including filter context and trust metadata.

## Endpoint
- `GET /api/exports/analyst?dataset=heatmap&analyticsId=<id>[&filters...]`

## Supported Filters
- `q`: menu search filter
- `top`: top-N row cap
- `segment`: `all|weekday|weekend` (weekly view segmentation)
- `sort`: `total|window`
- `sortWindow`: window label when `sort=window`
- `order`: `asc|desc`

## CSV Columns (Stable Order)
1. `dataset`
2. `generated_at`
3. `analytics_id`
4. `location_id`
5. `period_start`
6. `period_end`
7. `grain` (`daily` or `weekly`)
8. `menu_item`
9. `window_label`
10. `quantity`
11. `readiness` (`ready|degraded|blocked`)
12. `quality_status`
13. `freshness_minutes`
14. `segment`
15. `q`
16. `top`
17. `sort`
18. `sort_window`
19. `order`

## Notes
- Export is deterministic for a given analytics snapshot and filter state.
- Trust fields (`readiness`, `quality_status`, `freshness_minutes`) are included to preserve decision context outside the app UI.
- Backward-compatible additions are allowed as trailing columns with contract update notes.
