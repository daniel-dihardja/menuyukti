# Story 24: Add Anomaly Detection for Marketer KPIs

## Goal
Alert marketers when important menu or category performance shifts unexpectedly.

## Scope
- Detect anomalies for:
  - top-item revenue share
  - category mix shifts
  - margin drop by menu/category
- Persist anomaly events per run.
- Expose anomaly list in API.

## Acceptance Criteria
- At least one baseline detection method is implemented (e.g., z-score or moving window delta).
- Anomalies are tied to specific pipeline run IDs.
- API consumers can filter anomalies by location and period.

## Deliverables
- Anomaly detection job/module.
- Anomaly event table + API endpoint.

## Status
`complete`
