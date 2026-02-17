# 09. Pipeline Recovery Operations (Retry, Replay, Backfill)

## What This Feature Is About

This workflow lets operators trigger and monitor ETL recovery actions when data pipelines fail or coverage becomes stale.
It also provides ETL run-history observability so operators can review succeeded and failed runs in one place.

Main page:
- `/analytics/operations`

This feature is designed to restore trustworthy analytics outputs without ad-hoc scripts.
Use it whenever matrix/heatmap/scheduler/attribution pages are impacted by failed or stale pipeline states.

## Supported Actions

- `retry`: re-attempt a failed pipeline run.
- `replay`: re-run a known pipeline run context.
- `backfill`: reprocess a bounded date window.

## ETL Run History Panel

The same page includes an **ETL Run History** table that lists:
- `queued`, `running`, `succeeded`, and `failed` runs together.
- Pipeline run id, start/finish timestamps, duration, source, and error summary.
- Quality hints (for example: operation-triggered run, missing pipeline id, failure-needs-recovery).

Use this panel before triggering recovery so the team has a shared, evidence-based view of current ETL state.

## When To Use Each Action

- Use `retry` when:
  - a run failed due to transient processing/runtime issues.
  - you want the same run context to be attempted again.
- Use `replay` when:
  - a run may have succeeded, but downstream interpretation changed and you need controlled reprocessing.
  - you need deterministic rerun of a specific pipeline run id.
- Use `backfill` when:
  - a date range is stale or missing and must be regenerated.
  - you need to restore coverage for a specific operational window.

## How To Use

1. Open `/analytics/operations`.
2. Select location.
3. Choose action:
   - `retry`/`replay`: provide `pipelineRunId`.
   - `backfill`: provide `fromDate` and `toDate`.
4. Optionally provide reason context.
5. Queue operation.
6. Monitor status table (`queued`, `running`, `succeeded`, `failed`).

## Run History Filters and Pagination

Use filters to narrow triage quickly:
- Location selector.
- Status selector.
- Date window (`fromDate`, `toDate`).
- Search by pipeline run id or source text.

For larger histories, use **Load more** to continue using cursor-based pagination while keeping deterministic ordering.

## Step-by-Step Examples

### Example A: Retry Failed Run

1. Open ETL Run History and filter status to `failed`.
2. Open run details and verify error context and identifiers.
3. Click `Retry` shortcut directly from the failed run row (or queue `retry` manually).
4. Confirm the request is queued (or deduped).
5. Monitor status until `succeeded`.
6. Re-check matrix and scheduler readiness/freshness.

Expected result:
- failed source run is re-attempted.
- blocked/degraded trust states may recover after successful completion.

### Example B: Backfill Stale Week

1. Select action `backfill`.
2. Set `fromDate=2026-02-01`, `toDate=2026-02-07` (example).
3. Add reason: "Restore stale weekly coverage".
4. Queue operation and monitor status.
5. Re-open heatmap and attribution pages for the same location.

Expected result:
- missing/stale range is regenerated.
- downstream insights use refreshed range coverage.

### Example C: Replay From Run History

1. Find a run with a valid pipeline run id in ETL Run History.
2. Open row details to confirm context.
3. Click `Replay` shortcut from the row.
4. Verify the operation appears in Operation Status.
5. Validate affected analytics pages after completion.

## Safety and Guardrails

- Duplicate/idempotent requests are deduped by idempotency key.
- Active operation conflicts are blocked per location.
- `retry` only allows failed source runs.
- Backfill range is capped (`ETL_BACKFILL_MAX_DAYS`, default `31`).

## How To Interpret Operation Status

- `queued`: accepted and waiting to run.
- `running`: currently executing recovery.
- `succeeded`: operation completed; validate downstream pages.
- `failed`: operation failed; inspect error and choose retry/replay/backfill next step.

## Post-Operation Validation Checklist

1. Matrix page:
   - confirm freshness and quality status.
   - verify key decision rows are present.
2. Scheduler page:
   - confirm readiness state and confidence behavior.
3. Attribution page:
   - confirm data window coverage for recent posts.
4. Heatmap page:
   - confirm expected date/daypart visibility.
5. Operations page:
   - confirm ETL Run History reflects updated run states/timestamps.

## Why It Delivers Real Value

- Faster recovery from failed/stale pipeline states.
- Faster diagnosis because successful and failed runs are visible in one workflow.
- Consistent, controlled operations behavior without ad-hoc scripts.
- Better trust continuity for matrix, heatmap, scheduler, and attribution decisions.

## Persona Value

- Restaurant marketers:
  - restore campaign decision pages quickly when freshness degrades.
  - reduce delays in weekly Instagram planning caused by pipeline incidents.
  - maintain confidence signals before executing promotions.
  - distinguish quickly between true outages vs temporary lag by checking recent succeeded runs.
- Menu analysts:
  - recover profitability/margin decision views without manual data patching.
  - ensure pair/combo/attribution analysis uses complete and current windows.
  - keep weekly reporting cadence stable after pipeline failures.
  - justify reruns with run-history evidence before finalizing weekly action lists.
