CREATE OR REPLACE VIEW "marts"."vw_instagram_item_attribution_pre_post" AS
WITH mapped_posts AS (
    SELECT
        ip.id AS instagram_post_id,
        ip.campaign_id,
        ip.branch_id AS location_id,
        ip.published_at,
        ipi.canonical_menu_name,
        ipi.canonical_menu_name_norm,
        dl.location_key,
        dmi.menu_item_key
    FROM "public"."instagram_posts" ip
    INNER JOIN "public"."instagram_post_promoted_items" ipi
        ON ipi.instagram_post_id = ip.id
    INNER JOIN "warehouse"."dim_location" dl
        ON dl.operational_location_id = ip.branch_id
    INNER JOIN "warehouse"."dim_menu_item" dmi
        ON dmi.location_key = dl.location_key
       AND dmi.menu_name_norm = ipi.canonical_menu_name_norm
       AND dmi.is_current = TRUE
    WHERE ip.published_at IS NOT NULL
),
pre_window AS (
    SELECT
        mp.instagram_post_id,
        mp.campaign_id,
        mp.location_id,
        mp.published_at,
        mp.canonical_menu_name,
        SUM(foi.qty)::numeric(18, 6) AS pre_qty,
        SUM(foi.net_revenue)::numeric(18, 6) AS pre_revenue,
        SUM(COALESCE(foi.margin, 0))::numeric(18, 6) AS pre_margin,
        COUNT(DISTINCT foi.date_key)::int AS pre_active_days
    FROM mapped_posts mp
    LEFT JOIN "warehouse"."fact_order_item" foi
        ON foi.location_key = mp.location_key
       AND foi.menu_item_key = mp.menu_item_key
       AND foi.order_time >= mp.published_at - INTERVAL '3 day'
       AND foi.order_time < mp.published_at
    GROUP BY
        mp.instagram_post_id,
        mp.campaign_id,
        mp.location_id,
        mp.published_at,
        mp.canonical_menu_name
),
post_window AS (
    SELECT
        mp.instagram_post_id,
        mp.campaign_id,
        mp.location_id,
        mp.published_at,
        mp.canonical_menu_name,
        SUM(foi.qty)::numeric(18, 6) AS post_qty,
        SUM(foi.net_revenue)::numeric(18, 6) AS post_revenue,
        SUM(COALESCE(foi.margin, 0))::numeric(18, 6) AS post_margin,
        COUNT(DISTINCT foi.date_key)::int AS post_active_days
    FROM mapped_posts mp
    LEFT JOIN "warehouse"."fact_order_item" foi
        ON foi.location_key = mp.location_key
       AND foi.menu_item_key = mp.menu_item_key
       AND foi.order_time >= mp.published_at
       AND foi.order_time < mp.published_at + INTERVAL '3 day'
    GROUP BY
        mp.instagram_post_id,
        mp.campaign_id,
        mp.location_id,
        mp.published_at,
        mp.canonical_menu_name
)
SELECT
    pw.instagram_post_id,
    pw.campaign_id,
    pw.location_id,
    pw.published_at,
    pw.canonical_menu_name,
    COALESCE(pw.pre_qty, 0)::numeric(18, 6) AS pre_qty,
    COALESCE(qw.post_qty, 0)::numeric(18, 6) AS post_qty,
    (COALESCE(qw.post_qty, 0) - COALESCE(pw.pre_qty, 0))::numeric(18, 6) AS delta_qty,
    COALESCE(pw.pre_revenue, 0)::numeric(18, 6) AS pre_revenue,
    COALESCE(qw.post_revenue, 0)::numeric(18, 6) AS post_revenue,
    (COALESCE(qw.post_revenue, 0) - COALESCE(pw.pre_revenue, 0))::numeric(18, 6) AS delta_revenue,
    COALESCE(pw.pre_margin, 0)::numeric(18, 6) AS pre_margin,
    COALESCE(qw.post_margin, 0)::numeric(18, 6) AS post_margin,
    (COALESCE(qw.post_margin, 0) - COALESCE(pw.pre_margin, 0))::numeric(18, 6) AS delta_margin,
    COALESCE(pw.pre_active_days, 0) AS pre_active_days,
    COALESCE(qw.post_active_days, 0) AS post_active_days,
    CASE
        WHEN COALESCE(pw.pre_active_days, 0) >= 2
         AND COALESCE(qw.post_active_days, 0) >= 2
         AND (COALESCE(pw.pre_qty, 0) + COALESCE(qw.post_qty, 0)) >= 10 THEN 'high'
        WHEN COALESCE(pw.pre_active_days, 0) >= 1
         AND COALESCE(qw.post_active_days, 0) >= 1
         AND (COALESCE(pw.pre_qty, 0) + COALESCE(qw.post_qty, 0)) >= 4 THEN 'medium'
        ELSE 'low'
    END AS confidence_level,
    3::int AS attribution_window_days
FROM pre_window pw
INNER JOIN post_window qw
    ON qw.instagram_post_id = pw.instagram_post_id
   AND qw.canonical_menu_name = pw.canonical_menu_name;
