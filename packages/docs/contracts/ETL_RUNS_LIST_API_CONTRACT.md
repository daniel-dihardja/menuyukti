# ETL Runs List API Contract (v1)

## Purpose

Provide a deterministic, filterable run-history API for ETL observability.
This endpoint includes succeeded and failed runs in one response surface and is used by operations UI and E2E checks.

## Endpoint

- `GET /api/etl/runs`

## Query Parameters

- `locationId` (optional, integer)
- `status` (optional, repeatable or comma-separated)
  - allowed: `queued`, `running`, `succeeded`, `failed`
- `fromDate` (optional, ISO date or datetime)
- `toDate` (optional, ISO date or datetime)
- `search` (optional, source text or exact pipeline UUID)
- `limit` (optional, integer, default `50`, max `200`)
- `cursor` (optional, keyset cursor format: `createdAtIso|jobId`)

## Deterministic Behavior

- Sort order is fixed: `createdAt DESC, id DESC`.
- Pagination is keyset-based via `cursor` and `nextCursor`.
- Invalid query values return `400` with a stable error code.

## Response Shape

```json
{
  "runs": [
    {
      "id": "ck....",
      "status": "failed",
      "locationId": 1,
      "analyticsId": 12,
      "pipelineRunId": "00000000-0000-0000-0000-000000000000",
      "sourceFile": "operation:retry|pipelineRunId=...",
      "sourceKind": "operation",
      "idempotencyKey": "op-...",
      "createdAt": "2026-02-17T12:00:00.000Z",
      "startedAt": "2026-02-17T12:00:02.000Z",
      "finishedAt": "2026-02-17T12:01:30.000Z",
      "durationMs": 88000,
      "errorMessage": "full message",
      "errorSummary": "first line summary",
      "qualityHints": ["operation_trigger", "failure_needs_recovery"]
    }
  ],
  "page": {
    "limit": 50,
    "hasMore": true,
    "nextCursor": "2026-02-17T12:00:00.000Z|ck...."
  },
  "filters": {
    "locationId": 1,
    "statuses": ["failed", "succeeded"],
    "fromDate": "2026-02-01T00:00:00.000Z",
    "toDate": "2026-02-17T23:59:59.999Z",
    "search": "operation:retry"
  }
}
```

## Notes

- `qualityHints` are deterministic run-level diagnostics and not probabilistic scores.
- `search` matches `sourceFile` text; it also matches `pipelineRunId` when the search value is a valid UUID.
