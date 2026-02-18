# Epic: AI-Agentic Data Contract Refactor (Preserve Existing Analytics Surfaces)

## Epic ID
EPIC-AI-AGENTIC-DATA-CONTRACT-REFACTOR

## Owner
TBD

## Status
Draft

## Problem Statement
Menuyukti is being repositioned as an AI-agentic application for restaurant marketers (Instagram focus) and menu analysts. Current analytics pages (matrix, heatmap, pairs, scheduler, attribution, etc.) must remain available, but the underlying schema/contracts need to be refactored so agent outputs and UI decisions use shared, deterministic, traceable data structures.

## Goal
Ship a refactored canonical data model and contract layer that supports both:
- existing analytics pages (no route removal)
- AI-agentic insight workflows with explicit evidence, confidence, and readiness semantics

## MVP Definition (Focused Release Scope)
Menuyukti MVP must run end-to-end as an AI-agentic application for:
- restaurant marketers (Instagram-focused execution decisions)
- menu analysts (profitability, mix, and pairing decisions)

The MVP must be simple, reliable, and decision-grade. Do not optimize for breadth; optimize for trust, speed-to-decision, and operational stability.

### MVP Must-Have Features
1. **Canonical Decision Data Contract**
- One shared contract layer used by analytics pages and agent routes.
- Required fields: recommendation, rationale, confidence, readiness, evidence refs, freshness/quality, pipeline run lineage.

2. **Deterministic Analytics Core (Already-visible Surfaces stay intact)**
- Matrix page with action recommendations and explainability.
- Heatmap page with marketer/analyst insight summaries and trust badges.
- Pairs/combos page with support, confidence, lift, and ranking.
- COGS completeness page for analyst remediation.
- Attribution overview page with confidence-aware interpretation.

3. **Instagram Marketer Workflow (MVP level)**
- Scheduler page to convert recommendations into weekly post plans.
- Suggestion-to-schedule flow from matrix/heatmap signals.
- Basic post draft generation package (deterministic scaffold + editable fields).
- Finalize/save flow with readiness guardrails.

4. **AI Agentic Workflow (MVP level)**
- Agent can answer marketer/analyst questions using canonical precomputed features.
- Agent output must include explicit evidence references and confidence/readiness inheritance.
- Agent calls are blocked/degraded under failed/stale quality conditions.
- Cache agent output per analytics scope for repeatability.

5. **Data Engineering and Reliability Baseline**
- Ingestion -> ETL -> marts path with idempotency and rejection logging.
- Pipeline run lineage + run metrics + quality status available to all decision APIs.
- Seed/export scripts compatible with the refactored schema.

6. **Focused Release Validation**
- E2E coverage for critical marketer and analyst paths:
  - upload -> analytics availability
  - matrix/heatmap/pairs usability
  - scheduler save/finalize with guardrails
  - agent response with evidence fields
- Release docs/spec updated to final MVP behavior.

### Explicitly Out of Scope for MVP
- Advanced autonomous multi-agent orchestration loops.
- Full RBAC and enterprise governance hardening.
- Complex long-horizon simulation/planning engines.
- Fully generalized memory/RAG platform.
- Broad channel expansion beyond Instagram-centric marketer workflow.

### MVP Acceptance Criteria
1. All required decision pages remain operational and contract-consistent.
2. Agent outputs are traceable, confidence-scored, and readiness-governed.
3. Marketer can go from recommendation to saved weekly schedule in one workflow.
4. Analyst can produce actionable promote/improve/remove and pair/combo decisions.
5. Core reliability checks (idempotency, quality gate, lineage, seed determinism) pass.

## Page Inventory and Data Extraction Requirements
The pages below must remain available. This inventory defines what users can see/do and what data must be extracted/served by contracts.

### Decision Surfaces (Primary)
| Page | Route | What User Can See/Do | Required Data Extraction |
|---|---|---|---|
| Sales Snapshot | `/analytics/sales` | View uploaded analytics snapshots, rename/delete snapshot, open action dropdown, navigate to all decision pages with readiness badges. | Analytics snapshot metadata, location, upload period, per-action readiness signals, dependency reasons. |
| COGS Completeness | `/analytics/{analyticsId}/cogs` | Review COGS coverage KPIs, inspect missing/invalid menu item costs, update COGS values, copy COGS from another snapshot. | Menu item base metrics (qty/revenue/category), item-level COGS values, completeness KPIs, source snapshot options. |
| Matrix | `/analytics/{analyticsId}/matrix` | Review menu engineering table, filter/sort with URL state, inspect action reasons (`promote/improve/remove/keep`), view freshness/quality and category distribution. | Matrix row metrics (units/revenue/cogs/margin/margin%), action + action rationale, distribution buckets, freshness/quality/run metadata, COGS readiness state. |
| Heatmap | `/analytics/{analyticsId}/heatmap` | Review hourly/weekly demand heatmaps, apply filters/segment, inspect marketer and analyst insight cards, export filtered dataset, read trust/confidence badges. | Daily and weekly heatmap tensors, segmented aggregation outputs, derived insight summaries, trust/readiness/freshness signals, export contract payload. |
| Pairs and Combos | `/analytics/{analyticsId}/pairs` | Explore pair metrics and combo opportunities, filter by sample/lift/confidence/pair type/search, inspect explainability, sort/rank, export. | Pair metrics (support/confidence/lift/orders/noise), combo scoring (margin-aware score + pair-type boosts), pair type classification, freshness/quality context, filter-state contract. |
| Scheduler | `/analytics/{analyticsId}/scheduler` | Build weekly Instagram schedule, add/edit/remove entries, use deterministic suggestions, apply post composer, save/finalize with guardrails, inspect attribution outcomes by mapped post+menu. | Weekly schedule header + entry records, matrix-derived recommendations, heatmap-derived timing suggestions, post composer draft payloads, guardrail/readiness response, attribution outcome join by post/menu. |
| Attribution | `/analytics/{analyticsId}/attribution` | Inspect post/campaign performance by promoted menu, tune confidence policy via URL params, filter by time/post/menu, review confidence reasons, export for analyst use. | Attribution fact rows (pre/post qty/revenue deltas), campaign/post/menu mapping, confidence evaluation inputs + reasons, quality/freshness metadata, summary KPI aggregates. |
| Finance | `/analytics/{analyticsId}/finance` | Review financial KPI summary and profit calculation (revenue, COGS, fixed costs, net profit), print/share results. | Revenue/COGS/profit summary metrics, order and item KPIs, fixed cost records by location, currency metadata and formatting context. |

### Supporting Workflow Pages (Operational)
| Page | Route | What User Can See/Do | Required Data Extraction |
|---|---|---|---|
| Locations List | `/analytics/locations` | View registered branches/locations and open management flows. | Location master data, status metadata, creation/update timestamps. |
| Create Location | `/analytics/locations/create` | Create new location/branch metadata for analytics and planner scope. | Location input schema, uniqueness constraints, validation rules. |
| Fixed Cost Setup | `/analytics/locations/{locationId}/fixed-cost` | Configure fixed cost components that feed finance and analyst workflows. | Location-scoped fixed cost records, active/inactive status, amount history. |
| Operations | `/analytics/operations` | Monitor internal ETL operational status (if surfaced in environment). | ETL run history, job lifecycle status, timestamps, failure metadata. |

### Contract Implication
- Every page contract must expose: `decision payload`, `evidence payload`, `readiness/confidence payload`, and `lineage/freshness payload`.
- Shared canonical entities must be designed so one extraction path can power both UI pages and AI-agentic outputs.

## Data Structure Requirements (Performance + Cost + Reliability)
These are mandatory requirements for the target schema and contract design.

### 1) Canonical Domain Entities
- Define first-class canonical entities shared by analytics pages and agents:
  - `DecisionContext` (location, period, filters, run metadata)
  - `DecisionInsight` (recommendation, rationale, confidence, readiness)
  - `EvidenceRef` (source table/key/metric/value references)
  - `AgentRun` and `AgentOutput` (input hash, output hash, model metadata, latency/cost)
- Avoid page-specific contract duplication when fields represent the same business meaning.

### 2) Contract and Type Safety
- Replace free-form status/confidence strings with enums/check constraints where possible.
- Define required vs optional fields for canonical DTOs.
- Add contract version fields (`schema_version`, `contract_version`) on persisted outputs.
- Ensure backward-compatible read adapters during migration window.

### 3) Storage and Retention Tiers (Cost Control)
- Apply tiered retention by schema/table class:
  - `staging`: shortest retention (raw + rejected rows)
  - `warehouse`: medium retention for reproducibility
  - `marts/public snapshots`: long retention for product continuity
  - `agent telemetry/logs`: retention for audit, then archive/downsample
- Keep large raw payloads out of hot query paths when no longer needed.
- Persist only high-value derived outputs; avoid storing every transient runtime intermediate.

### 4) Query Performance Requirements
- Add indexes based on real read patterns per page/agent:
  - location + time range
  - run lineage lookup
  - scheduler week/date lookups
  - attribution joins by post/menu/date
- Use composite indexes aligned to route filters, not only single-column indexes.
- Ensure page APIs and agent tools read curated marts/facts, not raw staging tables.

### 5) Fact Scale Strategy
- Define partitioning strategy for high-growth facts (time and/or location based).
- Keep narrow, page-oriented aggregates/materializations for hot reads.
- Refresh aggregates incrementally where feasible; avoid full recompute per request.

### 6) JSON Usage Policy
- JSON fields are allowed for flexible payload edges, but:
  - core queryable metrics/dimensions must remain relational and indexed
  - heavy JSON snapshots must not be the only source for critical page calculations
  - JSON payloads should include schema/version metadata

### 7) Lineage, Trust, and Auditability
- Every decision payload must be traceable to deterministic sources:
  - `pipeline_run_id`
  - freshness timestamp
  - quality status/reasons
  - evidence references
- Agent outputs must persist enough metadata for replay/audit:
  - prompt/context hash
  - model/version
  - tool call summary
  - output/evidence linkage

### 8) Multi-Tenancy and Isolation
- Enforce location scoping in schema keys, indexes, and API predicates.
- Prevent cross-location joins in agent/tool read paths unless explicitly authorized.
- Validate foreign-key ownership for writable relation paths.

### 9) Caching and Compute Efficiency
- Introduce cacheable canonical read models for repeated page/agent requests.
- Cache keys must include location, period, filter state, and contract version.
- Prefer asynchronous heavy computations and pre-materialization over request-time recomputation.

### 10) Migration and Operational Safety
- Migration plan must support low-risk rollout via dual-read/adapter phase.
- Backfill scripts must be idempotent and verifiable by reconciliation checks.
- Seed/export scripts must remain deterministic under new schema.
- Add smoke checks for:
  - migration completeness
  - contract integrity
  - retention/index policy presence

## In Scope
- Canonical schema/data-structure refactor (Prisma + migrations)
- Shared contract model for analytics and agent outputs
- Readiness/confidence/trust semantics standardized across UI/API/agents
- Seed/export/backfill compatibility updates
- Incremental refactor of existing pages to target contracts
- Release-gate testing and spec/documentation updates

## Out of Scope
- Removing or replacing existing analytics routes/pages
- Full RBAC redesign
- New persona expansion beyond marketer and analyst

## Success Metrics
- 100% parity on existing page availability (`matrix`, `heatmap`, `pairs`, `scheduler`, `attribution`)
- 100% agent responses include deterministic evidence references and confidence/readiness fields
- 0 P0 regressions in release-gate E2E suites
- Seed/export scripts run successfully against new schema

## Milestones
1. M1: Target decision model + contract spec approved
2. M2: Schema migrations + compatibility strategy implemented
3. M3: API and UI routes migrated to canonical contracts
4. M4: Agent routes migrated with traceable evidence contracts
5. M5: Full validation pass (tests/e2e/docs/spec)

## Dependencies
- Existing Prisma schema and migrations in `apps/web/prisma`
- Seed/export scripts in `apps/web/scripts`
- Current specs in `packages/docs/planning/SPECS.md`

## Risks
- Contract drift between analytics pages and agent routes
- Migration/backfill gaps causing seed instability
- Hidden coupling in scheduler/attribution flows

## Mitigations
- Introduce typed canonical DTOs and adapter layer during migration window
- Add contract tests for all read APIs consumed by pages/agents
- Migrate page-by-page with compatibility checks before full cutover

## Child Stories

### Story 1: Product Decision Map and Canonical Domain Contracts
- **ID**: STORY-DC-01
- **Goal**: Define canonical decision entities and field-level semantics shared by pages and agents.
- **Deliverables**:
  - Decision model for recommendation, rationale, confidence, readiness, evidence
  - Field dictionary and required/optional definitions
  - Versioning policy (`v1`, `v1.x`)
- **DoD**:
  - Contract doc approved by product + engineering
  - Every retained page mapped to canonical entities

### Story 2: Schema Refactor Blueprint (Prisma + SQL)
- **ID**: STORY-DC-02
- **Goal**: Map current tables/fields to target schema and define migration plan.
- **Deliverables**:
  - Current -> target schema mapping matrix
  - Migration sequence with rollback notes
  - Dual-read or adapter strategy decision
- **DoD**:
  - Migration plan reviewed and signed off
  - No unresolved table/field ownership conflicts

### Story 3: Implement Schema Migrations and Compatibility Layer
- **ID**: STORY-DC-03
- **Goal**: Implement new schema and compatibility adapters without breaking existing routes.
- **Deliverables**:
  - Prisma schema updates + SQL migrations
  - Compatibility adapters for old/new payloads
  - Backfill scripts where needed
- **DoD**:
  - Migrations apply cleanly on fresh and existing DBs
  - Legacy route behavior preserved during transition

### Story 4: Seed/Export/Backfill Refactor
- **ID**: STORY-DC-04
- **Goal**: Align seed and export pipelines with the refactored schema.
- **Deliverables**:
  - Update `apps/web/prisma/seed/seed-tables.ts`
  - Update `apps/web/scripts/seed-from-sql.ts`
  - Update `apps/web/scripts/export-neon-seed-sql.ts`
  - Validate `db:seed`, `db:seed:export`, `db:seed:smoke`
- **DoD**:
  - Seed/export smoke checks pass deterministically
  - Seed artifact remains reproducible

### Story 5: API Contract Migration for Analytics + Agent Routes
- **ID**: STORY-DC-05
- **Goal**: Move API responses to canonical contract shape.
- **Deliverables**:
  - Typed DTOs shared across routes
  - Route contract updates (matrix/heatmap/pairs/scheduler/agents)
  - Contract tests for success/failure/readiness scenarios
- **DoD**:
  - All target routes expose canonical fields
  - Contract tests pass in CI

### Story 6: UI Refactor by Surface (No Route Removal)
- **ID**: STORY-DC-06
- **Goal**: Adapt retained pages to canonical data structures.
- **Deliverables**:
  - Matrix page adaptation
  - Heatmap page adaptation
  - Pairs page adaptation
  - Scheduler page adaptation
  - Attribution/supporting pages adaptation
- **DoD**:
  - Each page renders correctly from new contracts
  - Existing UX flows remain functional

### Story 7: Agentic Workflow Alignment
- **ID**: STORY-DC-07
- **Goal**: Ensure agent inputs/outputs use canonical contracts and deterministic evidence.
- **Deliverables**:
  - Agent input contract mapped to canonical entities
  - Agent output includes confidence/readiness/evidence references
  - Guardrails enforced for low-quality/stale data
- **DoD**:
  - Agent route tests validate traceability and guardrails
  - No agent output without contract-compliant evidence fields

### Story 8: Validation and Release Gate
- **ID**: STORY-DC-08
- **Goal**: Prove refactor safety through full test/e2e/doc updates.
- **Deliverables**:
  - Unit/integration updates
  - E2E updates for marketer and analyst critical paths
  - Spec/manual updates reflecting new model
- **DoD**:
  - Release-gate suites pass
  - `packages/docs/planning/SPECS.md` and related docs updated
  - No critical regression in retained pages

## Global Definition of Done (Epic)
- Existing analytics surfaces remain intact and usable
- Canonical schema/contracts adopted by UI, APIs, and agents
- Readiness/confidence semantics are consistent and test-covered
- Seed/export/backfill workflows operational on new schema
- Release-gate quality checks pass with updated docs

## Suggested Execution Order
1. STORY-DC-01
2. STORY-DC-02
3. STORY-DC-03 + STORY-DC-04
4. STORY-DC-05
5. STORY-DC-06 + STORY-DC-07
6. STORY-DC-08
