-- Run-level operational metrics for data quality and SLA monitoring.

CREATE TABLE IF NOT EXISTS warehouse.pipeline_run_metrics (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID NOT NULL REFERENCES warehouse.dim_pipeline_run(pipeline_run_id),
    input_rows INT NOT NULL,
    valid_rows INT NOT NULL,
    rejected_rows INT NOT NULL,
    reject_rate NUMERIC(10, 6) NOT NULL,
    load_duration_ms INT NOT NULL,
    quality_gate_passed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_run_metrics_pipeline_run_id
    ON warehouse.pipeline_run_metrics (pipeline_run_id);
