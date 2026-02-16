-- Composite indexes for frequent query predicates on warehouse facts.

CREATE INDEX IF NOT EXISTS ix_fact_order_item_loc_date_menu
    ON warehouse.fact_order_item (location_key, date_key, menu_item_key);

CREATE INDEX IF NOT EXISTS ix_fact_menu_hourly_loc_date_hour
    ON warehouse.fact_menu_hourly (location_key, date_key, hour_of_day);

CREATE INDEX IF NOT EXISTS ix_fact_menu_daily_loc_date_menu
    ON warehouse.fact_menu_daily (location_key, date_key, menu_item_key);
