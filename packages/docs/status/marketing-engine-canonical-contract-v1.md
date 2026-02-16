# Marketing Engine Canonical Contract v1

## Purpose

Define a single canonical schema contract for marketing analytics payloads, with a safe transition policy from legacy shapes.

This contract is for:

- ETL reliability
- stable downstream agent integrations
- schema governance and lineage

## Contract Version

- `schema_version`: `v1`
- Naming convention: `snake_case`
- Numeric rule: keep machine-usable numeric types (`int`/`float`), no numeric strings
- Temporal rule:
  - business periods use `date` (`YYYY-MM-DD`)
  - metadata timestamps use UTC `datetime` (`YYYY-MM-DDTHH:MM:SSZ`)

## Version Status

- Status: **FROZEN**
- Freeze date: **February 16, 2026**
- Rule: contract-breaking changes must bump schema version and include migration notes.

## Metadata Envelope (Required For Canonical Payloads)

All canonical payloads should include:

- `schema_version: str` (fixed value `v1`)
- `source_system: str` (safe default enum target: `esb | manual_upload | api`)
- `pipeline_run_id: str` (UUID recommended)
- `ingested_at_utc: datetime` (UTC timestamp)
- `quality_status: str` (safe default enum target: `passed | warning | failed`)

## Canonical Entities

### 1) SalesAnalyticsSummary v1

Required fields:

- `total_orders: int`
- `total_items_sold: int`
- `total_revenue: float`
- `avg_order_revenue: float`
- `max_order_revenue: float`
- `min_order_revenue: float`
- `avg_order_items: float`
- `max_order_items: int`
- `min_order_items: int`
- `avg_popularity_threshold: float`
- `popularity_index: list[dict]`
- `period_start: date`
- `period_end: date`

Canonical key:

- Use `avg_popularity_threshold` only (legacy alias `avg_popularity` supported during transition).

### 2) MenuHeatmap v1

Required fields:

- `menu: str`
- `menu_category: str`
- `menu_category_detail: str`
- `daily_heatmap: list[HourlyDemand]`
- `weekly_heatmap: list[WeeklyDemand]`
- `reporting_period: str` (format policy: `YYYY-MM`)

`HourlyDemand`:

- `hour: int` (`0..23`)
- `quantity: int` (`>=0`)

`WeeklyDemand`:

- `day: Literal["mon","tue","wed","thu","fri","sat","sun"]`
- `quantity: int` (`>=0`)

Canonical key rule:

- Use `snake_case` keys only (`daily_heatmap`, never `dailyHeatmap`).

### 3) MatrixDistribution v1

Required fields:

- `categories: list[CategoryDistribution]`

`CategoryDistribution`:

- `category: Literal["star","puzzle","plow_horse","low_end"]`
- `item_count: int`
- `item_share: float` (`0..1`)
- `margin_share: float` (`0..1`)

Canonical key rule:

- Use `item_count`, `item_share`, `margin_share` only.

### 4) MatrixItem v1

Required fields:

- `menu: str`
- `menu_category: str`
- `menu_category_detail: str`
- `category: Literal["star","puzzle","plow_horse","low_end"]`
- `action: Literal["keep","reprice","promote","remove"]`
- `quantity: int`
- `total_revenue: float`
- `cogs: float`
- `total_cogs: float`
- `margin_per_unit: float`
- `contribution_margin: float`
- `contribution_margin_percentage: float` (`0..1`)
- `we_value: float`

## Backward Compatibility And Deprecation Policy (Safe Defaults)

### Compatibility Window

- Maintain legacy alias/adapter support for **2 releases** after canonical `v1` rollout.
- After 2 releases, remove legacy keys/types in the next major schema update.

### Legacy Inputs Accepted During Transition

- camelCase variants (for example `dailyHeatmap`, `menuCategory`)
- legacy distribution keys (`count`, `percentage`, `margin_contribution_percentage`)
- `avg_popularity` alias for `avg_popularity_threshold`
- numeric-like strings only where adapters explicitly normalize (for example hour `"08"` -> `8`)

### Canonical Output Rule

- Producers must emit canonical `v1` keys and types.
- Legacy shapes are accepted only at boundaries via adapter layer.

## CI Enforcement Policy

- Contract-breaking key/type changes must fail CI unless:
  - `schema_version` is intentionally bumped, and
  - migration notes are documented.
- Compatibility tests must verify that legacy payloads still parse during transition window.

## Implementation Order

1. Introduce typed canonical models and aliases.
2. Add legacy-to-canonical adapters at boundaries.
3. Switch producers to canonical output shape.
4. Add metadata envelope and temporal typing.
5. Freeze contract with CI contract tests.
