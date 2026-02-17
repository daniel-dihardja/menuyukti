# 09. Pipeline Recovery Operations (Archived / Non-MVP)

## Status

This chapter is retained for historical reference only.

- The operations feature (`/analytics/operations`) is intentionally **de-scoped from the current MVP release**.
- End-user `retry` / `replay` / `backfill` controls are not part of the current shipped MVP surface.

## What Is Still Available

- Core upload -> analytics pipeline flow.
- COGS update -> downstream matrix refresh flow.
- ETL run-history API contract (`/api/etl/runs`) for internal observability use.
- Internal staged runner reliability guardrails (stale queued/running protection) as system internals.

## Why This Was De-Scoped

- Source upload files are not persisted for full ingest replay in the current product shape.
- Exposing recovery controls without full source replay value creates user confusion.
- MVP prioritizes direct marketer and menu-analyst decision workflows.

## Reintroduction Criteria (Post-MVP)

- Persisted source artifacts or equivalent immutable input snapshots.
- Fully executable and validated replay/retry/backfill handlers.
- Updated UX/runbook/tests/specs aligned to the restored feature surface.
