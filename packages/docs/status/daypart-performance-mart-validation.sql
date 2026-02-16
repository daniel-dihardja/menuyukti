-- Validate that mart totals reconcile to source fact table.
-- Replace :location_key with target location key.

WITH mart_totals AS (
  SELECT
    COALESCE(SUM(qty), 0) AS mart_qty,
    COALESCE(SUM(net_revenue), 0) AS mart_net_revenue
  FROM marts.vw_daypart_performance
  WHERE location_key = :location_key
),
fact_totals AS (
  SELECT
    COALESCE(SUM(qty), 0) AS fact_qty,
    COALESCE(SUM(net_revenue), 0) AS fact_net_revenue
  FROM warehouse.fact_order_item
  WHERE location_key = :location_key
)
SELECT
  m.mart_qty,
  f.fact_qty,
  (m.mart_qty - f.fact_qty) AS qty_delta,
  m.mart_net_revenue,
  f.fact_net_revenue,
  (m.mart_net_revenue - f.fact_net_revenue) AS revenue_delta
FROM mart_totals m
CROSS JOIN fact_totals f;
