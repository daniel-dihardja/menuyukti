-- Raw and rejected staging tables for replayability and quality tracking.

CREATE TABLE IF NOT EXISTS staging.stg_pos_raw (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL,
    source_system TEXT NOT NULL,
    source_file TEXT NULL,
    row_hash TEXT NOT NULL,
    row_data JSONB NOT NULL,
    ingested_at_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pipeline_run_id, row_hash)
);

CREATE TABLE IF NOT EXISTS staging.stg_pos_rejected (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL,
    source_system TEXT NOT NULL,
    source_file TEXT NULL,
    row_hash TEXT NOT NULL,
    row_data JSONB NOT NULL,
    rejection_reason TEXT NOT NULL,
    ingested_at_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pipeline_run_id, row_hash)
);

CREATE INDEX IF NOT EXISTS ix_stg_pos_raw_pipeline_run_id
    ON staging.stg_pos_raw (pipeline_run_id);

CREATE INDEX IF NOT EXISTS ix_stg_pos_rejected_pipeline_run_id
    ON staging.stg_pos_rejected (pipeline_run_id);
