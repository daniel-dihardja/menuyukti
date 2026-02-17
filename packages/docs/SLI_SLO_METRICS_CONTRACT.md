# Menuyukti Release SLI/SLO Metrics Contract

## Purpose
Define release-gate metrics with clear formulas, ownership, data sources, and thresholds for production readiness.

## Scope
This contract governs:
- ETL reliability and freshness
- Data quality
- Read-path performance
- Workflow readiness for marketer and analyst use-cases

## Review Cadence
- Weekly review: product owner + data engineering lead
- Pre-release review: mandatory for every production release

## Metric Definitions

| Metric | Type | Formula | Grain | Source | Owner |
|---|---|---|---|---|---|
| `etl_run_success_rate` | SLI | `successful_runs / total_runs` over rolling 7 days | daily rolling | `public.etl_jobs` | Data Eng |
| `etl_freshness_compliance_rate` | SLI | `% runs where (now - ingested_at_utc) <= freshness_window` | daily rolling | `warehouse.dim_pipeline_run` | Data Eng |
| `quality_gate_pass_rate` | SLI | `% runs with quality gate passed` | daily rolling | `warehouse.pipeline_run_metrics` | Data Eng |
| `rejection_rate` | SLI | `rejected_rows / input_rows` | per pipeline run | `warehouse.pipeline_run_metrics` | Data Eng |
| `reconciliation_pass_rate` | SLI | `% reconciliation rows within threshold` | per run, per metric | `warehouse.pipeline_reconciliation_report` | Data Eng |
| `matrix_read_api_p95_ms` | SLI | p95 response time for matrix read path | daily rolling | API telemetry/APM | Platform |
| `time_to_first_marketer_plan_minutes` | SLI | median time from upload accepted -> matrix ready + presets usable | per analytics upload | app telemetry + `etl_jobs` | Product |
| `time_to_first_analyst_action_minutes` | SLI | median time from upload accepted -> action table usable | per analytics upload | app telemetry + `etl_jobs` | Product |

## Release SLO Thresholds (Minimum)

| Metric | SLO |
|---|---|
| `etl_run_success_rate` | `>= 99%` |
| `etl_freshness_compliance_rate` | `>= 95%` |
| `quality_gate_pass_rate` | `>= 90%` (excluding intentionally invalid files) |
| `reconciliation_pass_rate` | `>= 99%` |
| `matrix_read_api_p95_ms` | `<= 1500 ms` |
| `time_to_first_marketer_plan_minutes` | `<= 15 min` |
| `time_to_first_analyst_action_minutes` | `<= 20 min` |

## Data Readiness Policy
- If freshness or quality SLO is breached for relevant run(s), recommendation confidence must be downgraded or blocked.
- UI must surface run metadata (`run_id`, quality, freshness age) for decision pages.

## Release Gate Rules
A release can proceed only when all are true for the evaluation window:
1. SLOs meet thresholds.
2. No unresolved severity-high data quality incidents.
3. Marketer and analyst critical E2E workflows pass.

## Known Gaps (Current)
- `matrix_read_api_p95_ms` requires formal APM-backed measurement wiring.
- `time_to_first_*` metrics require explicit event instrumentation for start/end markers.

## Change Management
- Contract version: `v1.0`
- Backward-compatible additions: allowed with changelog update.
- Threshold changes: require product owner and data engineering lead approval.
