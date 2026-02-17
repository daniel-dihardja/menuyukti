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

## Staged Lineage Compatibility Notes

- Staged lineage compatibility is enabled by default and can be toggled with `ETL_STAGE_LINEAGE_COMPAT_ENABLED`.
- Legacy ETL jobs can be backfilled into staged lineage tables using:
  - `pnpm -C apps/web run db:backfill:etl-lineage`
- Backfill uses `dry-run` mode by default.
- To write lineage records, run with `ETL_LINEAGE_BACKFILL_WRITE=1`.

## Why This Was De-Scoped

- Source upload files are not persisted for full ingest replay in the current product shape.
- Exposing recovery controls without full source replay value creates user confusion.
- MVP prioritizes direct marketer and menu-analyst decision workflows.

## Reintroduction Criteria (Post-MVP)

- Persisted source artifacts or equivalent immutable input snapshots.
- Fully executable and validated replay/retry/backfill handlers.
- Updated UX/runbook/tests/specs aligned to the restored feature surface.
