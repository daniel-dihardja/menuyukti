CREATE OR REPLACE VIEW "marts"."vw_pair_metrics_daily_base" AS
WITH pair_orders AS (
    SELECT
        fobp.location_key,
        fobp.date_key,
        fobp.menu_item_a_key,
        fobp.menu_item_b_key,
        COUNT(DISTINCT fobp.bill_number)::BIGINT AS pair_orders,
        SUM(fobp.pair_qty)::NUMERIC(18, 6) AS pair_qty
    FROM "warehouse"."fact_order_basket_pair" fobp
    GROUP BY
        fobp.location_key,
        fobp.date_key,
        fobp.menu_item_a_key,
        fobp.menu_item_b_key
),
item_orders AS (
    SELECT
        foi.location_key,
        foi.date_key,
        foi.menu_item_key,
        COUNT(DISTINCT foi.bill_number)::BIGINT AS item_orders
    FROM "warehouse"."fact_order_item" foi
    GROUP BY
        foi.location_key,
        foi.date_key,
        foi.menu_item_key
),
total_orders AS (
    SELECT
        foi.location_key,
        foi.date_key,
        COUNT(DISTINCT foi.bill_number)::BIGINT AS total_orders
    FROM "warehouse"."fact_order_item" foi
    GROUP BY
        foi.location_key,
        foi.date_key
)
SELECT
    p.location_key,
    p.date_key,
    p.menu_item_a_key,
    p.menu_item_b_key,
    p.pair_orders,
    p.pair_qty,
    COALESCE(ia.item_orders, 0)::BIGINT AS item_a_orders,
    COALESCE(ib.item_orders, 0)::BIGINT AS item_b_orders,
    COALESCE(t.total_orders, 0)::BIGINT AS total_orders
FROM pair_orders p
LEFT JOIN item_orders ia
    ON ia.location_key = p.location_key
   AND ia.date_key = p.date_key
   AND ia.menu_item_key = p.menu_item_a_key
LEFT JOIN item_orders ib
    ON ib.location_key = p.location_key
   AND ib.date_key = p.date_key
   AND ib.menu_item_key = p.menu_item_b_key
LEFT JOIN total_orders t
    ON t.location_key = p.location_key
   AND t.date_key = p.date_key;
