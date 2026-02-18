# Schema Refactor Blueprint (v1)

## Purpose

Define the target database structure for Menuyukti MVP as an AI-agentic system, and explain why each structural choice is used.

This blueprint is the Story-DC-02 artifact and guides Story-DC-03 implementation.

Related:

- `packages/docs/contracts/DECISION_CONTRACT_V1.md`
- `packages/docs/planning/SPECS.md`
- `packages/docs/planning/archive/EPIC-AI-AGENTIC-DATA-CONTRACT-REFACTOR/epic-ai-agentic-data-contract-refactor.md`

## MVP Design Goals

1. Keep decision pages stable (`matrix`, `heatmap`, `pairs`, `scheduler`, `attribution`, `finance`, `cogs`).
2. Ensure agent outputs reuse the same deterministic decision data.
3. Optimize for traceability, not schema novelty.
4. Keep compute and storage cost controlled as data volume grows.
5. Avoid over-engineering in MVP.

## Data Structure Principles

1. **Deterministic first**: compute core features in ETL/marts, not in LLM runtime.
2. **One contract, many consumers**: pages and agents read canonical decision entities.
3. **Lineage attached to every decision**: pipeline run + freshness + quality always available.
4. **Store high-value derived data only**: avoid persisting every transient runtime transform.
5. **Use relational for query-critical fields, JSON for flexible edges**.

## Target Logical Schema (Concept)

### 1) Operational (`public`)

Purpose:

- application-facing entities and workflows
- editable operational state

Keep/refine:

- `branches` (`Location`)
- `analytics` + `analytics_menu_items`
- `fixed_costs`
- `instagram_campaigns`, `instagram_posts`, `instagram_post_promoted_items`
- `instagram_weekly_schedules`, `instagram_weekly_schedule_entries`, draft tables
- `agent_outputs` (to be normalized for better traceability)

Why:

- Fast product iteration, scoped by location, and straightforward CRUD semantics.

### 2) ETL Staging (`staging`)

Purpose:

- short-lifetime ingest buffers and rejection observability

Keep/refine:

- `stg_pos_raw`, `stg_pos_clean`, `stg_pos_rejected`

Why:

- Allows deterministic ingest and quality diagnostics without polluting analytics reads.

Cost control:

- shortest retention tier.

### 3) Warehouse (`warehouse`)

Purpose:

- conformed dimensions and atomic facts

Keep/refine:

- dimensions: `dim_pipeline_run`, `dim_date`, `dim_location`, `dim_menu_item`, `dim_pos_source`
- facts: `fact_order_item`, `fact_menu_daily`, `fact_menu_hourly`, `fact_order_basket_pair`
- quality/ops: `pipeline_run_metrics`, `pipeline_reconciliation_report`

Why:

- Reliable and reusable base for all decision pages and agent evidence.

Performance:

- composite indexes by `(location, date/time)` and `(pipeline_run_id)` as primary query paths.

### 4) Curated Read Models (`marts` + canonical decision views)

Purpose:

- page/agent-ready deterministic aggregates

Use:

- matrix view/model
- heatmap model
- pair/combo models
- attribution model
- readiness/trust model

Why:

- Avoid expensive on-request recomputation and keep API latency stable.

## Canonical Decision Entities (DB-Oriented)

### `decision_context` (logical entity)

Fields:

- `location_id`, `analytics_id`, `persona`, `filter_state_json`
- `pipeline_run_id`, `quality_status`, `freshness_minutes`, `is_stale`
- `contract_version`

Why:

- single context object guarantees UI and agent see the same trust state.

### `decision_insight` (logical entity)

Fields:

- `insight_key`, `category`, `recommendation`, `rationale`
- `confidence`, `readiness`, `impact_metric`, `impact_value`
- `actions_json`, `tags_json`

Why:

- one insight format for all surfaces avoids contract drift.

### `decision_evidence_ref` (logical entity)

Fields:

- `insight_key`, `source_schema`, `source_entity`, `metric`, `value_json`
- identifying dimensions (`location_id`, `menu_name_norm`, `date_key`, etc.)
- `pipeline_run_id`

Why:

- mandatory traceability from recommendation to deterministic metrics.

### `agent_run` (logical entity)

Fields:

- `run_id`, `agent_id`, `model`, `status`
- `input_hash`, `output_hash`, `token_usage_json`, timestamps

Why:

- operational observability and cost tracking for LLM usage.

### `agent_output` (logical entity)

Fields:

- `run_id`, `decision_context_ref`, `summary`, `insights_json` or normalized links

Why:

- preserves replayable outputs while keeping shared decision schema alignment.

## Why This Structure (Decision Rationale)

1. **For performance**

- Read APIs can query precomputed marts and canonical decision projections.
- Composite indexes align with real filters (`location + date`, scheduler week, post/menu joins).
- ETL does heavy compute once; runtime remains lightweight.

2. **For cost**

- Tiered retention reduces storage growth on staging/log-heavy tables.
- No need to persist every runtime intermediate artifact.
- Reusing shared decision entities avoids duplicate per-page payload storage.

3. **For agentic reliability**

- Agent answers inherit existing quality/freshness guardrails.
- Evidence refs prevent non-traceable recommendations.
- Same decision semantics across UI and agent channels.

4. **For MVP simplicity**

- Preserves existing page topology and core models.
- Adds normalization where needed instead of a full platform rewrite.
- Enables phased migration with adapters.

## Lightweight Performance Optimization Plan (MVP)

This section defines low-complexity optimizations to implement now before deep tuning.

### A) Hot Query Index Plan (MVP Baseline)

Add/verify composite indexes aligned to current route filters:

1. Matrix/Heatmap reads

- `warehouse.fact_menu_daily (location_key, date_key, menu_item_key)`
- `warehouse.fact_menu_hourly (location_key, date_key, hour_of_day)`

2. Pairs/Combos reads

- `warehouse.fact_order_basket_pair (location_key, date_key, menu_item_a_key, menu_item_b_key)`
- keep `pipeline_run_id` index for lineage/debug filters

3. Scheduler reads/writes

- `public.instagram_weekly_schedules (branch_id, week_start_date)` unique/index
- `public.instagram_weekly_schedule_entries (schedule_id, scheduled_for)`
- `public.instagram_weekly_schedule_entries (branch_id, scheduled_for)`

4. Attribution reads

- `public.instagram_posts (branch_id, published_at)`
- `public.instagram_post_promoted_items (branch_id, canonical_menu_name_norm)`
- keep post id index for direct post filters

5. Agent lookup reads

- `public.agent_outputs (branch_id, analytics_id, agent_id)`

Why:

- These indexes match existing critical-page query shapes with minimal schema disruption.

### B) Partition Trigger Policy (Defer Until Needed)

Do not partition immediately. Trigger partitioning only when at least one condition is met:

- `warehouse.fact_order_item` exceeds 20 million rows, or
- p95 read latency for core analytics routes exceeds target for 2 consecutive weeks, or
- vacuum/maintenance overhead becomes operationally unstable.

Initial partition strategy when triggered:

- monthly range partition by date (`date_key`/order date), optionally sub-scoped by location for very large tenants.

Why:

- Avoid early complexity in MVP while keeping a clear threshold-based scale path.

### C) Materialization and Refresh Cadence

1. Recompute marts on successful ETL run (preferred incremental upsert/merge).
2. Keep page reads against curated marts/projections, not raw staging tables.
3. For expensive rollups, cache by `(location_id, analytics_id, filter_hash, contract_version)` with short TTL (5-15 minutes).

Why:

- Preserves deterministic outputs while reducing repeated compute on hot paths.

### D) Lightweight SLO Targets (MVP)

Set initial endpoint performance targets:

- Matrix/Heatmap/Pairs/Attribution read API: p95 <= 800ms
- Scheduler read/write API: p95 <= 600ms
- Agent context assembly (non-LLM data fetch): p95 <= 500ms

Validation method:

- run `EXPLAIN (ANALYZE, BUFFERS)` on top 2 queries per critical route before cutover
- capture baseline and post-change measurements in Story-DC-03 notes

### E) Cost Guardrails (MVP)

1. Retention defaults

- `staging`: 30 days
- ETL operational logs/metrics: 90 days hot, archive afterward
- warehouse/marts/public decision data: retained per product policy

2. Storage discipline

- avoid storing duplicate large JSON decision blobs when equivalent relational evidence exists
- persist only final agent outputs and necessary run metadata, not all transient tool intermediates

Why:

- Controls storage growth while preserving auditability and reproducibility.

## Migration Strategy (Blueprint Level)

### Phase 1: Contract and Read-Model Alignment

- Add canonical decision projections/adapters without breaking existing routes.
- Keep old payloads readable via adapters.

### Phase 2: Schema Tightening

- Introduce stronger constraints/enums for status/confidence/readiness.
- Normalize agent run metadata (hash/model/tokens/status).

### Phase 3: Cutover

- Switch page and agent routes to canonical contract outputs.
- Remove deprecated read paths after validation window.

## Compatibility Strategy

Chosen approach: **adapter-first with short dual-read window**.

Why:

- lower release risk
- allows side-by-side verification of old vs new payload shapes
- avoids big-bang cutover failures

## Risks and Mitigations

1. Risk: route regressions during contract switch.

- Mitigation: route-level contract tests + staged rollout.

2. Risk: storage growth from duplicated snapshots.

- Mitigation: retention policy + avoid redundant persisted derived blobs.

3. Risk: trust-state mismatch between UI and agent outputs.

- Mitigation: shared `decision_context` trust fields as single source.

## Acceptance Criteria (Story-DC-02)

- Current-to-target mapping is clear for all MVP decision surfaces.
- Migration sequence and compatibility strategy are documented.
- Data-structure choices are explicitly justified for performance and cost.
- Rollout risks and mitigations are documented and reviewable.
