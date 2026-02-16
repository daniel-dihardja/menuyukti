# Minimum Product Specs: Menuyukti

## Goal
Define the minimum set of capabilities required to deliver measurable value for:
- restaurant marketers (Instagram planning and execution)
- menu analysts (profitability, pricing, and combo optimization)

Menuyukti is a data-engineering-first product. Therefore, value must come from deterministic, trustworthy analytics before any AI narration.

---

## 1. Product Success Metrics (Minimum)

### 1.1 Marketer Outcomes
- Time-to-first-weekly Instagram plan: <= 15 minutes from upload.
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
- Retry policy for transient failures and replay/backfill capability.
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
- Post brief scaffold per recommended item:
  - angle/hook
  - offer suggestion
  - CTA direction
  - caption starter
- Shareable decision views (URL state) for collaboration and approval.

### 5.3 Instagram Attribution (Minimum)
- Track campaign/post identifier and promoted item mapping.
- Compute basic before/after sales signal by item and daypart window.
- Mark attribution confidence as low when sample size/coverage is insufficient.

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

- Branch/company-level data isolation (multi-tenant safety).
- Role-based access control for sensitive analytics actions.
- Audit trail for uploads, recalculations, and recommendation-affecting edits.
- Privacy-safe telemetry payloads (no raw sensitive data leakage).

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
1. SLOs are met for the defined window.
2. Data quality gate behavior is enforced in UI and APIs.
3. Marketer workflow and analyst workflow each pass end-to-end validation.
4. Recommendation outputs remain traceable to deterministic feature inputs.

---

## 11. Current Implementation Status (As of 2026-02-16)

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
- `Not Yet`: CSV export flow for analyst workflows is not present.

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
- `Partial`: Cost/price control support exists via COGS update flows, but analyst export/reporting is still limited.
- `Not Yet`: Pair-menu/co-purchase analytics (support/confidence/lift) and combo opportunity engine are not implemented.

### 11.5 Agentic Architecture
- `Implemented`: Agents consume structured `core_input` payloads, with deterministic feature derivation in marketing-engine features.
- `Partial`: Guardrails based on quality/freshness are present in ETL and matrix UI, but not consistently enforced in all agent invocation paths.
- `Partial`: Versioned contracts exist for analytics/marketing-engine, but agent I/O contract governance can be tightened further.

### 11.6 Security, Tenancy, and Governance
- `Partial`: Location/branch scoping exists in data model and routes.
- `Not Yet`: Full RBAC and explicit tenant-boundary enforcement are not yet implemented as formal authz controls.
- `Not Yet`: End-to-end audit trail for all recommendation-affecting actions is incomplete.

### 11.7 E2E Validation
- `Implemented`: E2E upload journey (with artifacts) and matrix filter journey (with artifacts).
- `Partial`: Full release-gate E2E coverage for all marketer and analyst workflows remains incomplete.

### 11.8 Minimal Release Feature Table

| # | Minimal Release Feature | Status | Notes |
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
| 13 | COGS completeness workflow for analysts | Partial | COGS update flow exists; completeness dashboards/export still limited. |
| 14 | Marketer action workflow (`promote/improve/remove`) | Implemented | Action-oriented matrix UX and presets are available. |
| 15 | Instagram weekly post scheduling workflow | Partial | Foundations exist, but full scheduling UX/workflow is not fully productized. |
| 16 | Instagram attribution (post/campaign -> sales lift) | Partial | Baseline pre/post attribution mart and read API endpoint implemented; confidence tuning and full UX integration still pending. |
| 26 | Instagram campaign/post identity data model | Implemented | Canonical `instagram_campaigns` and `instagram_posts` with branch scope, identity fields, and publish-time indexes. |
| 27 | Post-to-promoted-menu mapping model + upsert API | Implemented | Canonical mapping table with idempotent write path and dedupe by normalized menu name. |
| 17 | Pair-menu analysis (support/confidence/lift) | Partial | Basket-pair fact foundation is implemented; support/confidence/lift mart and scoring endpoint are pending. |
| 28 | Order basket pair fact + idempotent refresh SQL | Implemented | `warehouse.fact_order_basket_pair` and `warehouse.refresh_fact_order_basket_pair(run_id)` added for deterministic co-purchase base data. |
| 18 | Combo recommendation engine | Not Yet | Margin-aware combo ranking not implemented yet. |
| 19 | Agent architecture using structured feature inputs | Implemented | Agents invoke with structured `core_input` and derived features. |
| 20 | Agent guardrails for low-quality/fresh data | Partial | ETL/UI guards exist; agent-level enforcement is not consistently applied. |
| 21 | RBAC and explicit tenant authz controls | Not Yet | Location scoping exists, formal RBAC not yet implemented. |
| 22 | Audit trail for recommendation-affecting actions | Not Yet | Not fully implemented as a complete audit system. |
| 23 | E2E upload -> analytics path | Implemented | Playwright e2e with artifact capture exists. |
| 24 | E2E matrix filter/preset path | Implemented | Dedicated matrix journey e2e exists with artifacts. |
| 25 | Full release-gate E2E suite (marketer + analyst) | Partial | Core flows covered, full release matrix still incomplete. |
