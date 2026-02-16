# Story 14: Operationalize Data Quality and SLA

## Goal
Make quality, reliability, and SLA health measurable and enforceable.

## Scope
- Add run-level metrics:
  - input rows
  - valid rows
  - rejected rows
  - reject rate
  - load duration
- Add quality gates in CI/runtime.
- Define SLA/SLO targets for pipeline runtime and freshness.

## Acceptance Criteria
- Metrics are persisted and observable.
- Alert thresholds are defined and actionable.
- Failing quality gates block bad downstream publication.

## Deliverables
- Metrics table/model + dashboard spec.
- SLA/SLO doc + alert policy.

## Status
`todo`
