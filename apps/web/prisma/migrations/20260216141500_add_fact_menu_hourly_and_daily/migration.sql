-- Derived aggregate facts for hourly and daily menu analytics.

CREATE TABLE IF NOT EXISTS warehouse.fact_menu_hourly (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL REFERENCES warehouse.dim_pipeline_run(pipeline_run_id),
    date_key INT NOT NULL REFERENCES warehouse.dim_date(date_key),
    location_key BIGINT NOT NULL REFERENCES warehouse.dim_location(location_key),
    menu_item_key BIGINT NOT NULL REFERENCES warehouse.dim_menu_item(menu_item_key),
    hour_of_day INT NOT NULL,
    qty NUMERIC(12, 3) NOT NULL,
    net_revenue NUMERIC(14, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pipeline_run_id, date_key, location_key, menu_item_key, hour_of_day)
);

CREATE TABLE IF NOT EXISTS warehouse.fact_menu_daily (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL REFERENCES warehouse.dim_pipeline_run(pipeline_run_id),
    date_key INT NOT NULL REFERENCES warehouse.dim_date(date_key),
    location_key BIGINT NOT NULL REFERENCES warehouse.dim_location(location_key),
    menu_item_key BIGINT NOT NULL REFERENCES warehouse.dim_menu_item(menu_item_key),
    qty NUMERIC(12, 3) NOT NULL,
    net_revenue NUMERIC(14, 4) NOT NULL,
    cogs NUMERIC(14, 4) NULL,
    margin NUMERIC(14, 4) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pipeline_run_id, date_key, location_key, menu_item_key)
);

CREATE INDEX IF NOT EXISTS ix_fact_menu_hourly_pipeline
    ON warehouse.fact_menu_hourly (pipeline_run_id);

CREATE INDEX IF NOT EXISTS ix_fact_menu_daily_pipeline
    ON warehouse.fact_menu_daily (pipeline_run_id);
