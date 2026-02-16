CREATE OR REPLACE VIEW "marts"."vw_combo_opportunity_candidates" AS
WITH pair_agg AS (
    SELECT
        b.location_key,
        b.menu_item_a_key,
        b.menu_item_b_key,
        SUM(b.pair_orders)::NUMERIC(18, 6) AS pair_orders,
        SUM(b.pair_qty)::NUMERIC(18, 6) AS pair_qty,
        SUM(b.item_a_orders)::NUMERIC(18, 6) AS item_a_orders,
        SUM(b.item_b_orders)::NUMERIC(18, 6) AS item_b_orders,
        SUM(b.total_orders)::NUMERIC(18, 6) AS total_orders,
        MIN(b.date_key) AS first_date_key,
        MAX(b.date_key) AS last_date_key
    FROM "marts"."vw_pair_metrics_daily_base" b
    GROUP BY
        b.location_key,
        b.menu_item_a_key,
        b.menu_item_b_key
),
pair_metrics AS (
    SELECT
        p.location_key,
        p.menu_item_a_key,
        p.menu_item_b_key,
        p.pair_orders,
        p.pair_qty,
        p.item_a_orders,
        p.item_b_orders,
        p.total_orders,
        p.first_date_key,
        p.last_date_key,
        CASE WHEN p.total_orders = 0 THEN 0 ELSE p.pair_orders / p.total_orders END AS support,
        CASE WHEN p.item_a_orders = 0 THEN 0 ELSE p.pair_orders / p.item_a_orders END AS confidence_a_to_b,
        CASE WHEN p.item_b_orders = 0 THEN 0 ELSE p.pair_orders / p.item_b_orders END AS confidence_b_to_a,
        CASE
            WHEN p.total_orders = 0 OR p.item_a_orders = 0 OR p.item_b_orders = 0 THEN 0
            ELSE (p.pair_orders / p.item_a_orders) / (p.item_b_orders / p.total_orders)
        END AS lift_a_to_b,
        CASE
            WHEN p.total_orders = 0 OR p.item_a_orders = 0 OR p.item_b_orders = 0 THEN 0
            ELSE (p.pair_orders / p.item_b_orders) / (p.item_a_orders / p.total_orders)
        END AS lift_b_to_a
    FROM pair_agg p
),
menu_margin AS (
    SELECT
        fmd.location_key,
        fmd.menu_item_key,
        CASE
            WHEN SUM(fmd.qty) = 0 THEN 0
            ELSE SUM(COALESCE(fmd.margin, 0)) / SUM(fmd.qty)
        END::NUMERIC(18, 6) AS avg_margin_per_unit
    FROM "warehouse"."fact_menu_daily" fmd
    GROUP BY
        fmd.location_key,
        fmd.menu_item_key
)
SELECT
    pm.location_key,
    dl.operational_location_id AS location_id,
    pm.menu_item_a_key,
    pm.menu_item_b_key,
    ma.menu_name AS menu_item_a_name,
    mb.menu_name AS menu_item_b_name,
    pm.pair_orders,
    pm.pair_qty,
    pm.support,
    pm.confidence_a_to_b,
    pm.confidence_b_to_a,
    pm.lift_a_to_b,
    pm.lift_b_to_a,
    COALESCE(mm_a.avg_margin_per_unit, 0) AS avg_margin_per_unit_a,
    COALESCE(mm_b.avg_margin_per_unit, 0) AS avg_margin_per_unit_b,
    (
      (pm.support * 100.0)
      + (((pm.confidence_a_to_b + pm.confidence_b_to_a) / 2.0) * 100.0)
      + (((pm.lift_a_to_b + pm.lift_b_to_a) / 2.0) * 10.0)
    ) / 3.0 AS pair_strength_score,
    GREATEST(COALESCE(mm_a.avg_margin_per_unit, 0), 0)
    + GREATEST(COALESCE(mm_b.avg_margin_per_unit, 0), 0) AS margin_score,
    (
      (
        (pm.support * 100.0)
        + (((pm.confidence_a_to_b + pm.confidence_b_to_a) / 2.0) * 100.0)
        + (((pm.lift_a_to_b + pm.lift_b_to_a) / 2.0) * 10.0)
      ) / 3.0
    )
    * (
      1
      + GREATEST(COALESCE(mm_a.avg_margin_per_unit, 0), 0)
      + GREATEST(COALESCE(mm_b.avg_margin_per_unit, 0), 0)
    ) AS combo_opportunity_score,
    pm.first_date_key,
    pm.last_date_key,
    dd_first.full_date AS first_seen_date,
    dd_last.full_date AS last_seen_date,
    CASE
      WHEN pm.pair_orders >= 20 THEN 'high'
      WHEN pm.pair_orders >= 8 THEN 'medium'
      ELSE 'low'
    END AS confidence_level
FROM pair_metrics pm
INNER JOIN "warehouse"."dim_location" dl
    ON dl.location_key = pm.location_key
INNER JOIN "warehouse"."dim_menu_item" ma
    ON ma.menu_item_key = pm.menu_item_a_key
INNER JOIN "warehouse"."dim_menu_item" mb
    ON mb.menu_item_key = pm.menu_item_b_key
LEFT JOIN menu_margin mm_a
    ON mm_a.location_key = pm.location_key
   AND mm_a.menu_item_key = pm.menu_item_a_key
LEFT JOIN menu_margin mm_b
    ON mm_b.location_key = pm.location_key
   AND mm_b.menu_item_key = pm.menu_item_b_key
LEFT JOIN "warehouse"."dim_date" dd_first
    ON dd_first.date_key = pm.first_date_key
LEFT JOIN "warehouse"."dim_date" dd_last
    ON dd_last.date_key = pm.last_date_key;
