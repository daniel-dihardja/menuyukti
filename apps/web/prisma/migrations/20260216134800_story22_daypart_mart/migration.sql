-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "marts";

-- Create daypart performance mart view
CREATE OR REPLACE VIEW "marts"."vw_daypart_performance" AS
SELECT
  foi.location_key,
  dmi.menu_category,
  CASE
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 5 AND 10 THEN 'breakfast'
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 11 AND 14 THEN 'lunch'
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 15 AND 17 THEN 'afternoon'
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 18 AND 22 THEN 'dinner'
    ELSE 'late_night'
  END AS daypart,
  dd.is_weekend,
  SUM(foi.qty) AS qty,
  SUM(foi.net_revenue) AS net_revenue,
  SUM(COALESCE(foi.margin, 0)) AS margin
FROM warehouse.fact_order_item foi
INNER JOIN warehouse.dim_menu_item dmi
  ON dmi.menu_item_key = foi.menu_item_key
INNER JOIN warehouse.dim_date dd
  ON dd.date_key = foi.date_key
GROUP BY
  foi.location_key,
  dmi.menu_category,
  CASE
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 5 AND 10 THEN 'breakfast'
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 11 AND 14 THEN 'lunch'
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 15 AND 17 THEN 'afternoon'
    WHEN EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC')) BETWEEN 18 AND 22 THEN 'dinner'
    ELSE 'late_night'
  END,
  dd.is_weekend;
