# Minimum Product Specs: Menuyukti

## Goal
Define the minimum set of capabilities required to deliver measurable value for:
- restaurant marketers (Instagram planning and execution)
- menu analysts (profitability, pricing, and combo optimization)

Menuyukti is a data-engineering-first product. Therefore, value must come from deterministic, trustworthy analytics before any AI narration.
Menuyukti is a data engineering application that serves two primary value paths:
- Restaurant marketers who need focused Instagram marketing decisions.
- Menu analysts who need data-driven menu improvement and marketing decisions (for example: combo offers, happy hour strategies, and item-level promote/improve/remove actions).

This document reflects the current release state and defines what is required for a **minimum valuable product (MVP) release** today.

---

## 1. Product Success Metrics (Minimum)

MVP value must be demonstrated for both primary personas:
- Restaurant marketers receive actionable Instagram marketing decisions from trustworthy analytics.
- Menu analysts receive decision-grade profitability and mix insights from trustworthy analytics.

### 1.1 Marketer Outcomes
- Time-to-first marketer decision package (matrix + presets + recommended actions): <= 15 minutes from upload.
- At least one data-backed promotion candidate per branch/week when quality is `passed`.
- Shareable decision views adopted by marketing team (URL-based filter state).

### 1.2 Analyst Outcomes
- Analysts can produce a weekly `promote/improve/remove` action list in <= 20 minutes.
- Pair-menu opportunities include support/confidence/lift and margin-aware ranking.
- Low-margin high-volume items are continuously visible and prioritized.

### 1.3 Platform Outcomes
- Decisions shown in UI must be traceable to deterministic features and run metadata.
- No recommendation should be shown as confident when quality/freshness is below threshold.

---

## 1A. MVP Release Baseline (Gate-Critical)

For a minimum valuable release, all items below are required and release-blocking:
- Upload -> ETL -> marts path with idempotency, rejection logging, and pipeline run lineage.
- Decision-grade matrix workflow with explainable actions, freshness/quality visibility, filter presets, and URL state.
- Marketer value path: branch/daypart promotion candidates and confidence-aware rationale suitable for Instagram planning.
- Analyst workflow with pair metrics, combo opportunities, and CSV export.
- Analyst value path: profitability, margin, and mix decisions are explainable and exportable for weekly review.
- Agent invocation with structured feature inputs and data-readiness guardrails.
- Release-gate E2E coverage for marketer and analyst critical paths, including failure artifacts.
- SLI/SLO contract defined and quality-gate behavior enforced in UI/API behavior.

Items not listed above are not release-blocking for MVP, but may remain important for post-MVP hardening and scale.

---

## 2. Data Engineering Minimum Requirements

### 2.1 Ingestion and Normalization
- Support primary POS ingestion flow (Excel/exports in MVP scope).
- Idempotent ingestion by file hash/signature and branch scope.
- Canonical normalized schema for orders, order items, menu identity, branch, timestamps.
- Structured rejection logging with reason codes (`missing_required_field`, `invalid_type_conversion`, etc.).

### 2.2 Data Quality and Trust
- Required-field validation gates before downstream marts.
- Quality status emitted per run: `passed`, `warn`, `failed`.
- Freshness metadata shown in product UI for every decision page.
- Stable menu identity strategy (no name-only matching drift).
- Confidence downgrade or suppression when quality/freshness criteria are not met.

### 2.3 Data Modeling and Delivery
- Layered architecture: `staging` -> `warehouse` -> `marts`.
- Conformed dimensions: time/daypart, location/branch, menu item, campaign/post.
- Atomic facts for order item, basket pairs, and campaign exposure (if available).
- Read APIs consume curated marts/contracts, never raw staging tables.
- Deterministic transforms and reproducible outputs.

### 2.4 Contracts and Versioning
- Versioned contracts (`v1`, `v1.x`) for API payloads and marts.
- Backward-compatibility policy and deprecation window documented.
- Required vs optional fields explicitly defined per contract.

### 2.5 Operations and Reliability
- Pipeline run tracking: `run_id`, status, duration, row counts, rejection counts.
- Retry policy for transient failures and replay/backfill capability (MVP accepts documented/manual operations while productized automation is pending).
- SLA checks for stale/failed runs.
- Reconciliation checks for key KPIs (orders, revenue, item counts).

---

## 3. SLO/SLI Minimum Requirements

- Freshness SLO: >= 95% of successful daily runs within agreed freshness window.
- Pipeline success SLO: >= 99% successful scheduled runs (excluding invalid input files).
- Core read API SLO: p95 latency target defined for matrix and analyst endpoints.
- Quality gate SLI: % of runs with `passed` status tracked weekly.

---

## 4. Core Analytics Minimum Requirements

- Menu engineering matrix with:
  - units sold
  - revenue
  - COGS
  - contribution margin
  - margin percentage
  - action recommendation (`keep`, `promote`, `improve/reprice`, `remove`)
  - action explainability reason
- Daypart and weekday demand profiles.
- Category mix and contribution-share views.
- Branch and date-range filtering.
- Data freshness + quality status surfaced alongside metrics.

---

## 5. Restaurant Marketer (Instagram) Minimum Features

### 5.1 Actionable Campaign Inputs
- Weekly prioritized promotion candidates by branch and daypart.
- Recommended posting windows based on observed demand timing.
- Item-level rationale and confidence indicator for each recommendation.

### 5.2 Content Execution Support
- Post brief scaffold per recommended item (minimum contract-level support):
  - angle/hook
  - offer suggestion
  - CTA direction
  - caption starter
- Shareable decision views (URL state) for collaboration and approval.

### 5.3 Instagram Attribution (Minimum)
- Track campaign/post identifier and promoted item mapping.
- Baseline before/after sales signal by item and daypart window is available via API/mart.
- Attribution confidence must be downgradeable when sample size/coverage is insufficient.

Note: Full end-user scheduling UX and full attribution UX are not release-blocking for MVP.

---

## 6. Menu Analyst Minimum Features

### 6.1 Decision Views
- Low-margin high-volume watchlist.
- High-margin low-popularity opportunity list.
- Item-level explanation for action assignment.

### 6.2 Pairing and Combo Analysis
- Popular pair-menu detection with:
  - support
  - confidence
  - lift
- Combo candidate list ranked by margin-aware opportunity score.
- Minimum sample-size threshold to avoid noisy pair suggestions.

### 6.3 Cost and Pricing Controls
- COGS completeness checks and missing value alerts.
- Reprice/improve queue based on profitability patterns.
- Exportable analyst table for weekly review cycles.

---

## 7. UI/UX Minimum Requirements

- Unified matrix table with robust filter bar and presets.
- Presets for marketer and analyst workflows.
- Clear empty states and recovery actions.
- Quality/freshness badges visible on all decision pages.
- CSV export for analyst workflows.
- Accessibility baseline (keyboard operable controls and meaningful labels).

---

## 8. Agentic System Minimum Requirements

- Agents consume structured feature outputs, not raw source tables.
- Deterministic recommendation layer precedes LLM generation.
- Agent outputs must include referenced feature signals and rationale.
- Guardrails block/highlight low-quality-data recommendations.
- Versioned schemas for agent prompt I/O contracts.
- Tool permissions and tenant boundaries enforced.

---

## 9. Security, Tenancy, and Governance Minimum Requirements

- Branch/location-level data isolation in data model and route scoping.
- Privacy-safe telemetry payloads (no raw sensitive data leakage).

Post-MVP hardening targets (important, but not MVP release-blocking):
- Full role-based access control for sensitive analytics actions.
- End-to-end audit trail for uploads, recalculations, and recommendation-affecting edits.

---

## 10. E2E Validation Minimum Requirements

- E2E path covering:
  - upload -> ETL -> analytics generation
  - matrix view availability
  - filter/preset workflows
  - recommendation visibility
  - freshness/quality badge visibility
- Stable selectors and reproducible fixtures.
- Failure artifacts (screenshot/video/log) for debugging.

---

## Release Gate (Minimum)

A release is production-ready only if:
1. MVP Release Baseline (Section 1A) is satisfied.
2. Data quality gate behavior is enforced in UI and APIs.
3. Marketer workflow and analyst workflow each pass end-to-end validation.
4. Marketer and analyst workflows each show explicit persona value in acceptance checks:
   - marketer: actionable Instagram recommendation outputs with rationale/confidence
   - analyst: decision-grade data outputs for profitability/mix optimization
5. Recommendation outputs remain traceable to deterministic feature inputs.
6. Defined SLOs are either met for the evaluation window, or have explicit temporary waiver documented with owner, expiry date, and mitigation.

---

## 11. Current Implementation Status (As of 2026-02-17)

Legend:
- `Implemented`: Delivered and observable in code/runtime.
- `Partial`: Implemented in part, but still missing key completion criteria.
- `Not Yet`: Not implemented yet.

### 11.1 Data Engineering and ETL
- `Implemented`: Release SLI/SLO contract and metric definitions documented.
- `Implemented`: Async upload ingestion with job queue/status API, idempotency key, and duplicate detection.
- `Implemented`: Layered schemas (`staging`, `warehouse`, `marts`) and core warehouse facts/dimensions.
- `Implemented`: Rejection logging with reason codes and quality gate threshold policy.
- `Implemented`: Pipeline run metadata, run metrics, and reconciliation table.
- `Partial`: Retry/replay/backfill operational workflow is not fully defined as productized runbook/automation.

### 11.2 Core Analytics and UI
- `Implemented`: Unified matrix table with robust filter bar, URL-based filter state, and presets.
- `Implemented`: Action explainability reasons and matrix freshness/quality visibility on matrix page.
- `Implemented`: Daypart mart read endpoint.
- `Implemented`: Accessibility baseline improvements for matrix filters/table.
- `Implemented`: CSV export endpoint for analyst matrix/pair/combo datasets with stable columns and metadata.
- `Implemented`: Pair/combo analysis now has a dedicated GUI route with filter bar, KPI cards, ranked tables, explainability sheet, and secondary export actions.
- `Implemented`: Pair/combo GUI URL-based filter bar with typed state parsing/serialization and shareable query context.
- `Implemented`: Pair/combo tables support interactive column sorting directly in GUI.
- `Implemented`: Pair filter controls include in-context tooltips for Min sample size and Min lift.
- `Implemented`: Pair filter controls include tooltips for Min sample size, Min lift, Min confidence, and Sort by options.
- `Implemented`: Pair/combo marts, APIs, exports, and GUI now support deterministic `pair_type` classification (`food_drink`, `food_food`, `drink_drink`, `unknown`).
- `Implemented`: Combo scoring includes deterministic `food_drink` boost with explainable fields (`base_combo_opportunity_score`, `pair_type_boost_factor`, `pair_type_boost_applied`).

### 11.3 Marketer (Instagram) Capabilities
- `Implemented`: Recommendation-centric matrix workflow (`promote`, `improve/reprice`, `remove`, `keep`).
- `Implemented`: Agent invocation path for audience/tone and cached outputs.
- `Implemented`: Instagram campaign and post identity model with branch scope and publish-window query indexes.
- `Implemented`: Deterministic post-to-promoted-menu mapping model and idempotent mapping upsert API.
- `Partial`: Weekly posting schedule and campaign planning loop are not fully productized in current app UX.
- `Partial`: Baseline before/after Instagram attribution mart and read API exist; full productized attribution workflow and UX are still pending.

### 11.4 Menu Analyst Capabilities
- `Implemented`: Low-margin/high-volume style decisioning via matrix filters and presets.
- `Implemented`: Deterministic warehouse basket-pair fact table and idempotent per-run refresh SQL function.
- `Implemented`: Pair metrics mart and API with support, confidence, lift, minimum sample threshold, and noise flag.
- `Implemented`: Margin-aware combo opportunity scoring mart and ranked API for top-N analyst candidates.
- `Implemented`: Pair-type-aware analyst workflow: pair type filtering, pair type badges, and explainability of pair-type score adjustment.
- `Partial`: Cost/price control support exists via COGS update flows, but analyst export/reporting is still limited.

### 11.5 Agentic Architecture
- `Implemented`: Agents consume structured `core_input` payloads, with deterministic feature derivation in marketing-engine features.
- `Implemented`: Guardrails based on quality/freshness are enforced in agent invocation routes with machine-readable readiness status.
- `Partial`: Versioned contracts exist for analytics/marketing-engine, but agent I/O contract governance can be tightened further.

### 11.6 Security, Tenancy, and Governance
- `Partial`: Location/branch scoping exists in data model and routes.
- `Not Yet`: Full RBAC and explicit tenant-boundary enforcement are not yet implemented as formal authz controls.
- `Not Yet`: End-to-end audit trail for all recommendation-affecting actions is incomplete.

### 11.7 E2E Validation
- `Implemented`: E2E upload journey (with artifacts) and matrix filter journey (with artifacts).
- `Implemented`: Release-gate E2E script covers marketer preset/recommendation flow and analyst CSV export flow with artifacts.
- `Implemented`: Pair/combo GUI E2E journey validates filter application, explainability UI, and export link behavior.

### 11.8 Minimal Release Feature Table

| # | MVP Release-Critical Feature | Status | Notes |
|---|---|---|---|
| 0 | Release SLI/SLO metrics contract | Implemented | Contract documented with formulas, owners, and thresholds. |
| 1 | Async upload ingestion job (`queued/running/succeeded/failed`) | Implemented | Job queue + polling endpoint exists. |
| 2 | Idempotent ingestion and duplicate detection | Implemented | File-hash + idempotency key in ETL job flow. |
| 3 | POS normalization with rejection reasons | Implemented | Rejection rows and required-field reason codes are persisted. |
| 4 | Quality gate on ingestion | Implemented | Reject-rate threshold policy enforced. |
| 5 | Layered data model (`staging/warehouse/marts`) | Implemented | Prisma schemas and ETL loads are in place. |
| 6 | Pipeline run lineage + metrics + reconciliation | Implemented | Pipeline run table, metrics table, reconciliation report table exist. |
| 7 | Menu engineering matrix (revenue/COGS/margin/actions) | Implemented | Matrix and action reasoning available. |
| 8 | Matrix explainability in UI | Implemented | Action reason tooltip and canonical reason fields are present. |
| 9 | Unified matrix table with filters + presets | Implemented | Single table, filter bar, URL state, presets delivered. |
| 10 | Freshness + quality visibility on decision page | Implemented | Matrix page shows run, quality, freshness, stale warning. |
| 11 | Daypart analytics endpoint | Implemented | Daypart mart API route exists. |
| 12 | Menu alias mapping for canonicalization | Implemented | Alias table and ETL join logic are present. |
| 13 | COGS coverage support for analysts (MVP level) | Implemented | COGS update flow exists and supports matrix profitability decisions; deeper completeness reporting remains post-MVP hardening. |
| 14 | Marketer action workflow (`promote/improve/remove`) | Implemented | Action-oriented matrix UX and presets are available. |
| 15 | Instagram campaign/post identity data model | Implemented | Canonical `instagram_campaigns` and `instagram_posts` with branch scope, identity fields, and publish-time indexes. |
| 16 | Post-to-promoted-menu mapping model + upsert API | Implemented | Canonical mapping table with idempotent write path and dedupe by normalized menu name. |
| 17 | Pair-menu analysis (support/confidence/lift) | Implemented | Pair metrics mart and API deliver support/confidence/lift with configurable sample threshold and noise flag. |
| 18 | Combo recommendation engine | Implemented | Margin-aware combo opportunity mart and ranked API endpoint are implemented. |
| 19 | Analyst CSV export (matrix/pairs/combos) | Implemented | `/api/exports/analyst` exports filtered datasets with stable columns and generation metadata. |
| 20 | Agent architecture using structured feature inputs + guardrails | Implemented | Agents invoke with structured `core_input`; readiness helper enforces block/downgrade behavior. |
| 21 | E2E upload -> analytics + release-gate workflows | Implemented | Upload, matrix, release-gate, and pair/combo e2e suites are wired with artifact capture. |

### 11.9 Open Features Backlog (All `Partial` + `Not Yet`, Not Release-Blocking for MVP)

| # | Post-MVP Capability | Status | Notes |
|---|---|---|---|
| H1 | Productized Instagram weekly scheduling UX/workflow | Partial | Foundations exist, but full workflow is not yet productized in app UX. |
| H2 | Full Instagram attribution UX + confidence tuning | Partial | Baseline pre/post attribution mart and read API exist; full workflow integration is pending. |
| H3 | Productized retry/replay/backfill runbooks/automation | Partial | Operational workflow exists but is not fully automated/productized. |
| H4 | Analyst cost/price completeness reporting hardening | Partial | COGS update flow exists, but richer analyst completeness reporting/export coverage remains limited. |
| H5 | Agent I/O contract governance hardening | Partial | Versioned contracts exist, but tighter governance for agent input/output schemas remains pending. |
| H6 | Tenant-boundary enforcement hardening beyond current scoping | Partial | Location/branch scoping exists in model/routes; formalized explicit tenant-boundary authz controls remain incomplete. |
| H7 | Full RBAC and explicit tenant authz controls | Not Yet | Location scoping exists; formal RBAC remains pending. |
| H8 | End-to-end audit trail for recommendation-affecting actions | Not Yet | Not fully implemented as a complete audit system. |
