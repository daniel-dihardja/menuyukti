-- Atomic canonical fact table (one row per order line item).

CREATE TABLE IF NOT EXISTS warehouse.fact_order_item (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL REFERENCES warehouse.dim_pipeline_run(pipeline_run_id),
    date_key INT NOT NULL REFERENCES warehouse.dim_date(date_key),
    location_key BIGINT NOT NULL REFERENCES warehouse.dim_location(location_key),
    menu_item_key BIGINT NOT NULL REFERENCES warehouse.dim_menu_item(menu_item_key),
    pos_source_key BIGINT NOT NULL REFERENCES warehouse.dim_pos_source(pos_source_key),
    bill_number TEXT NOT NULL,
    line_number INT NULL,
    qty NUMERIC(12, 3) NOT NULL,
    gross_revenue NUMERIC(14, 4) NOT NULL,
    net_revenue NUMERIC(14, 4) NOT NULL,
    discount NUMERIC(14, 4) NOT NULL,
    cogs NUMERIC(14, 4) NULL,
    margin NUMERIC(14, 4) NULL,
    order_time TIMESTAMPTZ NOT NULL,
    row_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pipeline_run_id, row_hash)
);

CREATE INDEX IF NOT EXISTS ix_fact_order_item_date_key
    ON warehouse.fact_order_item (date_key);

CREATE INDEX IF NOT EXISTS ix_fact_order_item_location_key
    ON warehouse.fact_order_item (location_key);

CREATE INDEX IF NOT EXISTS ix_fact_order_item_menu_item_key
    ON warehouse.fact_order_item (menu_item_key);

CREATE INDEX IF NOT EXISTS ix_fact_order_item_pipeline_run_id
    ON warehouse.fact_order_item (pipeline_run_id);
