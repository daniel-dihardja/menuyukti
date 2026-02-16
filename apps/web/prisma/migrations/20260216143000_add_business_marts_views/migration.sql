-- Business-facing marts for marketer and analyst consumption.

CREATE OR REPLACE VIEW marts.mart_menu_performance AS
SELECT
    fmd.location_key,
    fmd.menu_item_key,
    SUM(fmd.qty) AS total_qty,
    SUM(fmd.net_revenue) AS total_net_revenue,
    SUM(fmd.cogs) AS total_cogs,
    SUM(fmd.margin) AS total_margin
FROM warehouse.fact_menu_daily fmd
GROUP BY
    fmd.location_key,
    fmd.menu_item_key;

CREATE OR REPLACE VIEW marts.mart_daypart_behavior AS
SELECT
    fmh.location_key,
    fmh.menu_item_key,
    CASE
        WHEN fmh.hour_of_day < 11 THEN 'morning'
        WHEN fmh.hour_of_day < 14 THEN 'lunch'
        WHEN fmh.hour_of_day < 17 THEN 'afternoon'
        ELSE 'evening'
    END AS daypart,
    SUM(fmh.qty) AS total_qty,
    SUM(fmh.net_revenue) AS total_net_revenue
FROM warehouse.fact_menu_hourly fmh
GROUP BY
    fmh.location_key,
    fmh.menu_item_key,
    CASE
        WHEN fmh.hour_of_day < 11 THEN 'morning'
        WHEN fmh.hour_of_day < 14 THEN 'lunch'
        WHEN fmh.hour_of_day < 17 THEN 'afternoon'
        ELSE 'evening'
    END;

CREATE OR REPLACE VIEW marts.mart_profitability_mix AS
SELECT
    fmd.location_key,
    dmi.menu_category,
    dmi.menu_category_detail,
    SUM(fmd.net_revenue) AS revenue,
    SUM(fmd.cogs) AS cogs,
    SUM(fmd.margin) AS margin
FROM warehouse.fact_menu_daily fmd
INNER JOIN warehouse.dim_menu_item dmi
    ON dmi.menu_item_key = fmd.menu_item_key
GROUP BY
    fmd.location_key,
    dmi.menu_category,
    dmi.menu_category_detail;

CREATE OR REPLACE VIEW marts.mart_agent_marketing_signals AS
SELECT
    ao.agent_id,
    ao.branch_id AS location_id,
    ao.analytics_id,
    ao.created_at,
    ao.updated_at
FROM agent_outputs ao;
