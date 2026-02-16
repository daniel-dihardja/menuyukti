-- Pipeline governance dimension for lineage and run-level quality tracking.

CREATE TABLE IF NOT EXISTS warehouse.dim_pipeline_run (
    pipeline_run_id UUID PRIMARY KEY,
    schema_version TEXT NOT NULL,
    source_system TEXT NOT NULL,
    source_file TEXT NULL,
    ingested_at_utc TIMESTAMPTZ NOT NULL,
    quality_status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_dim_pipeline_run_ingested_at
    ON warehouse.dim_pipeline_run (ingested_at_utc DESC);

CREATE INDEX IF NOT EXISTS ix_dim_pipeline_run_source_system
    ON warehouse.dim_pipeline_run (source_system);
