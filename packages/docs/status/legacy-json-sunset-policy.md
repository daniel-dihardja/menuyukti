# Legacy JSON Sunset Policy

## Scope

Legacy analytics JSON fields in operational table `analytics`:

- `matrix_json`
- `matrix_distribution_json`
- `heatmap_json`
- `popularity_json`
- `insights_json`

## Policy

1. During migration, writes are controlled by:
- `LEGACY_JSON_WRITES_ENABLED`

2. Default behavior:
- Enabled unless explicitly set to `0`.

3. Sunset process:
- Phase 1: dual-run with writes enabled.
- Phase 2: set `LEGACY_JSON_WRITES_ENABLED=0` in non-prod and verify.
- Phase 3: set `LEGACY_JSON_WRITES_ENABLED=0` in prod for 2 release cycles.
- Phase 4: remove legacy JSON write path and columns in a dedicated migration.

## Rollback

1. Re-enable writes by setting `LEGACY_JSON_WRITES_ENABLED=1`.
2. Continue warehouse reconciliation during rollback window.
