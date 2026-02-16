# Warehouse Target Model v1

## Purpose

Define the production target warehouse model for Menuyukti ETL so table grains, KPI ownership, and lineage contracts are stable before implementation.

This model is designed for:

- marketer analytics
- menu analyst workflows
- agent feature generation
- scalable historical analysis

## Layered Architecture

1. `staging`
- Raw and validated ingest outputs.

2. `warehouse`
- Conformed dimensions and canonical facts.

3. `marts`
- Business-facing analytical views/tables.

Current operational Prisma schema remains the serving/application layer during migration.

## Fact Grains (Locked)

### 1) `warehouse.fact_order_item`

Grain:
- One row per order line item from POS ingest.

Required keys:
- `pipeline_run_id`
- `date_key`
- `location_key`
- `menu_item_key`
- `pos_source_key`
- source order identifiers (`bill_number`, optional `line_number`)

Measures:
- `qty`
- `gross_revenue`
- `net_revenue`
- `discount`
- `cogs`
- `margin`

Role:
- Canonical atomic fact and primary source for downstream derived facts.

### 2) `warehouse.fact_menu_hourly`

Grain:
- One row per `menu_item_key x location_key x business_date x hour`.

Measures:
- `qty`
- `net_revenue` (optional)

Role:
- Heatmap/daypart analytics and peak hour features.

### 3) `warehouse.fact_menu_daily`

Grain:
- One row per `menu_item_key x location_key x business_date`.

Measures:
- `qty`
- `net_revenue`
- `cogs`
- `margin`
- derived popularity share metrics

Role:
- Menu engineering trend analysis and marketer reporting.

## Dimension Contracts (Conformed)

1. `warehouse.dim_date`
- Calendar attributes for reporting and grouping.

2. `warehouse.dim_location`
- Branch/location identity, currency, timezone.

3. `warehouse.dim_pos_source`
- POS provider and extractor version attributes.

4. `warehouse.dim_menu_item`
- Surrogate key + natural key (`location + normalized_menu_name`).
- SCD2 supported when category/detail can change.

5. `warehouse.dim_pipeline_run`
- Lineage and quality metadata for every ETL run.

## KPI Ownership (Single Source Of Truth)

1. `total_orders`
- Source: `warehouse.fact_order_item` (distinct bill count per filtered scope).

2. `total_items_sold`
- Source: `warehouse.fact_order_item` (`sum(qty)` with business filters).

3. `total_revenue`
- Source: `warehouse.fact_order_item` (`sum(net_revenue)`).

4. `avg_order_revenue`
- Source: `warehouse.fact_order_item` (order-level aggregate over positive-revenue orders).

5. `avg_order_items`
- Source: `warehouse.fact_order_item` (order-level qty aggregate).

6. `hourly/weekly demand`
- Source: `warehouse.fact_menu_hourly` (+ day mapping via `dim_date`).

7. `menu matrix distribution`
- Source: `warehouse.fact_menu_daily` (category-level derived model in `marts`).

## Data Contract And Lineage Rules

1. All warehouse fact rows must include `pipeline_run_id`.
2. ETL loads must be idempotent by deterministic row keys/hashes.
3. Canonical naming convention is `snake_case`.
4. Contract version remains `v1` until intentional version bump.

## Incremental Strategy (Initial)

1. `fact_order_item`
- Append/merge by unique source event key and `pipeline_run_id`.

2. `fact_menu_hourly` and `fact_menu_daily`
- Incremental aggregation from changed/added `fact_order_item` partitions.

3. Dimensions
- Upsert with deterministic natural-key mapping.
- SCD2 only for dimensions that require historical attribute tracking.

## Non-Goals For v1

1. Full campaign attribution modeling.
2. Real-time streaming ingestion.
3. Deprecation of legacy JSON serving fields (handled in later phase).

## Approval Checklist

1. Grain definitions approved by engineering.
2. KPI ownership approved by analytics stakeholders.
3. Lineage fields accepted as mandatory in all fact models.
4. Migration sequence aligned with dual-run strategy.
