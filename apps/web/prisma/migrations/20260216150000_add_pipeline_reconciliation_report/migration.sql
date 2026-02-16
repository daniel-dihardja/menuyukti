-- Dual-run reconciliation report for parity checks between legacy and warehouse outputs.

CREATE TABLE IF NOT EXISTS warehouse.pipeline_reconciliation_report (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL REFERENCES warehouse.dim_pipeline_run(pipeline_run_id),
    location_key BIGINT NOT NULL REFERENCES warehouse.dim_location(location_key),
    metric_name TEXT NOT NULL,
    legacy_value NUMERIC(18, 6) NOT NULL,
    warehouse_value NUMERIC(18, 6) NOT NULL,
    delta NUMERIC(18, 6) NOT NULL,
    within_threshold BOOLEAN NOT NULL,
    threshold_value NUMERIC(18, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pipeline_reco_run_metric
    ON warehouse.pipeline_reconciliation_report (pipeline_run_id, metric_name);
