-- Clean typed staging table for validated POS rows.

CREATE TABLE IF NOT EXISTS staging.stg_pos_clean (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL,
    source_system TEXT NOT NULL,
    source_file TEXT NULL,
    row_hash TEXT NOT NULL,
    bill_number TEXT NOT NULL,
    menu TEXT NOT NULL,
    qty NUMERIC(12, 3) NOT NULL,
    price NUMERIC(14, 4) NOT NULL,
    total_after_bill_discount NUMERIC(14, 4) NOT NULL,
    order_time TIMESTAMPTZ NOT NULL,
    menu_category TEXT NOT NULL,
    menu_category_detail TEXT NOT NULL,
    ingested_at_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pipeline_run_id, row_hash)
);

CREATE INDEX IF NOT EXISTS ix_stg_pos_clean_pipeline_run_id
    ON staging.stg_pos_clean (pipeline_run_id);

CREATE INDEX IF NOT EXISTS ix_stg_pos_clean_order_time
    ON staging.stg_pos_clean (order_time);
