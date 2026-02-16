# Marketing Engine Schema Review (Data Engineering / ETL)

## Scope

This is a post-refactoring status review for `packages/marketing-engine`, focused on:

- schema contract consistency
- typing and validation rigor
- temporal modeling
- governance and lineage
- ETL reliability and maintainability

Review date: **February 16, 2026**

## Current Rating

**8.1/10**

The package is now materially closer to production-ready ETL contracts. Major contract inconsistencies were addressed, while a smaller set of data-platform concerns remains open.

## What Is Now Implemented

1. Canonical contract v1 established and frozen.
- Added canonical spec with compatibility policy:
  - `packages/docs/status/marketing-engine-canonical-contract-v1.md`

2. Typed canonical contract models added.
- Added `v1` contract models and aliases:
  - `packages/marketing-engine/src/marketing_engine/core/contracts/v1.py`

3. Legacy-to-canonical adapter layer added.
- Boundary adapters now normalize legacy shapes:
  - `packages/marketing-engine/src/marketing_engine/core/contracts/adapters.py`
  - `apps/analytics/app/main.py`

4. Heatmap producer aligned to canonical output.
- Now emits snake_case keys, integer hour, and reporting period:
  - `packages/marketing-engine/src/marketing_engine/core/analytics/calculate_menu_heatmaps.py`

5. Matrix distribution producer aligned to canonical keys.
- Uses `item_count`, `item_share`, `margin_share`:
  - `packages/marketing-engine/src/marketing_engine/core/analytics/calculate_menu_engineering_matrix.py`

6. Metadata envelope added to analytics outputs.
- Includes `schema_version`, `source_system`, `pipeline_run_id`, `ingested_at_utc`, `quality_status`:
  - `packages/marketing-engine/src/marketing_engine/core/contracts/metadata.py`
  - `packages/marketing-engine/src/marketing_engine/core/analytics/calculate_sales_analytics.py`
  - `apps/analytics/app/main.py`

7. Contract tests and legacy compatibility tests added.
- Canonical output and compatibility paths are tested:
  - `packages/marketing-engine/tests/analytics/contract/test_output_contracts_v1.py`

## Closed Vs Open Gaps

### Closed

1. Heatmap producer/consumer key and type mismatch.
2. Matrix distribution key mismatch.
3. Missing canonical schema versioning policy.
4. Missing contract test coverage for key output shapes.
5. Missing metadata envelope in response payloads.

### Open (Remaining Work)

1. Stable business keys are still missing in core entities.
- `menu` text is still the effective identity in many flows.
- Recommended next step: add `menu_id` and consistently include `location_id`.

2. Temporal typing is still mixed.
- Canonical contract models support typed date/datetime, but legacy core models still use string periods.
- Example:
  - `packages/marketing-engine/src/marketing_engine/core/models/sales_analytics_summary.py`

3. Data quality observability is still limited.
- No structured rejection-reason histogram from normalization stage.
- Recommended next step: add quality counters and reason codes.

4. Transform performance can still improve.
- Matrix calculation still uses `DataFrame.apply(axis=1)` paths.
- Recommended next step: vectorize row computations where possible.

5. Medallion-style layering is not yet implemented.
- Recommended next step: formalize bronze/silver/gold datasets for replayability and clearer lineage.

## Updated Optimization Priorities

1. Add stable entity keys (`menu_id`, `location_id`) and migration plan.
2. Complete temporal typing migration in non-canonical legacy models.
3. Add data quality metrics (accepted/rejected rows + reason codes).
4. Vectorize matrix transform hotspots.
5. Define lightweight bronze/silver/gold data contracts.

## Summary

This doc started as a pre-refactor gap assessment and is now updated to reflect current implementation status. The schema layer is substantially stronger and governed, with remaining work focused on identity strategy, observability, and performance hardening.

## Related Playbook

- Matrix decision playbook for operators:
  - `packages/docs/status/matrix-marketer-analyst-playbook.md`
