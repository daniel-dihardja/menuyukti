# Story 10: Performance Hardening (Partitioning, Indexing, Vectorization)

## Goal
Guarantee scalable query and transform performance under growing data volume.

## Scope
- Partition large fact tables by `business_date`.
- Add clustering/indexing strategy for:
  - `location_key`
  - `menu_item_key`
  - `pipeline_run_id`
- Optimize transform hotspots (replace row-wise operations with vectorized logic where possible).

## Acceptance Criteria
- Query benchmarks improve on representative workloads.
- ETL runtime improves or remains stable after optimization.
- Index/partition strategy is documented for operations.

## Deliverables
- Migration/index scripts.
- Benchmark report before/after.

## Status
`todo`
