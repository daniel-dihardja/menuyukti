# 09. Pipeline Recovery Operations (Retry, Replay, Backfill)

## What This Feature Is About

This workflow lets operators trigger and monitor ETL recovery actions when data pipelines fail or coverage becomes stale.

Main page:
- `/analytics/operations`

## Supported Actions

- `retry`: re-attempt a failed pipeline run.
- `replay`: re-run a known pipeline run context.
- `backfill`: reprocess a bounded date window.

## How To Use

1. Open `/analytics/operations`.
2. Select location.
3. Choose action:
   - `retry`/`replay`: provide `pipelineRunId`.
   - `backfill`: provide `fromDate` and `toDate`.
4. Optionally provide reason context.
5. Queue operation.
6. Monitor status table (`queued`, `running`, `succeeded`, `failed`).

## Safety and Guardrails

- Duplicate/idempotent requests are deduped by idempotency key.
- Active operation conflicts are blocked per location.
- `retry` only allows failed source runs.
- Backfill range is capped (`ETL_BACKFILL_MAX_DAYS`, default `31`).

## Why It Delivers Real Value

- Faster recovery from failed/stale pipeline states.
- Consistent, controlled operations behavior without ad-hoc scripts.
- Better trust continuity for matrix, heatmap, scheduler, and attribution decisions.
