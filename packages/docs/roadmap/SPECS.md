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
