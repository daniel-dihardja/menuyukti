# Operations Runbook: Retry, Replay, Backfill (v1)

## Purpose

This runbook defines when and how to trigger ETL recovery actions safely.

## Actions

- `retry`
  - Use when a specific pipeline run failed and the same run context should be re-attempted.
  - Requires `pipelineRunId`.
- `replay`
  - Use when you need to reprocess an existing pipeline run context without declaring it a failure retry.
  - Requires `pipelineRunId`.
- `backfill`
  - Use when a date window must be reprocessed to fill stale/missing coverage.
  - Requires `fromDate` and `toDate`.
  - Date window is guardrailed by `ETL_BACKFILL_MAX_DAYS` (default `31`).

## API

- Create/list operations:
  - `POST /api/etl/operations`
  - `GET /api/etl/operations?locationId=<id>&limit=<n>[&status=<status>][&action=<action>]`

## Safety Rules

- Idempotency:
  - Requests dedupe by `idempotencyKey` (supplied or deterministic).
- Conflict guard:
  - New requests are blocked while another operation is `queued` or `running` in the same location.
- Retry precondition:
  - `retry` requires source run status `failed`.
- Backfill guard:
  - backfill range is validated and capped.

## Common Error Codes

- `INVALID_ACTION`
- `INVALID_LOCATION_ID`
- `LOCATION_NOT_FOUND`
- `INVALID_PIPELINE_RUN_ID`
- `SOURCE_PIPELINE_RUN_NOT_FOUND`
- `RETRY_REQUIRES_FAILED_SOURCE_RUN`
- `INVALID_DATE_RANGE`
- `INVALID_DATE_RANGE_ORDER`
- `BACKFILL_RANGE_TOO_LARGE`
- `OPERATION_CONFLICT_ACTIVE_RUN`
- `IDEMPOTENCY_KEY_CONFLICT`

## Recommended Workflow

1. Validate affected location and run context.
2. Start with `retry` for a failed run when possible.
3. Use `replay` for controlled reprocessing of a known run.
4. Use `backfill` only for bounded, justified date windows.
5. Monitor operation status until terminal state.
6. Re-validate matrix/heatmap/scheduler readiness after completion.
