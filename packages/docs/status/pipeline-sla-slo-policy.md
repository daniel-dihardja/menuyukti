# Pipeline SLA/SLO Policy

## Scope

Applies to analytics ingestion pipeline writes and warehouse publication path.

## Metrics Captured

- `input_rows`
- `valid_rows`
- `rejected_rows`
- `reject_rate`
- `load_duration_ms`
- `quality_gate_passed`

## Initial SLO Targets

1. Freshness
- Ingestion request to persisted analytics snapshot: under 60 seconds (p95).

2. Quality
- Reject rate target: <= 20% (warning above target).
- Hard quality gate threshold: 40% (publication blocked).

3. Reliability
- Pipeline run success target: 99% monthly.

## Alerting Guidance

1. Warn
- reject rate > 20%
- duration > 60s p95

2. Critical
- quality gate blocked run
- repeated failures for same source file type
