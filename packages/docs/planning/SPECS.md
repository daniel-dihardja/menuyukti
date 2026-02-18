# Minimum Product Specs: Menuyukti

## Goal
Define the minimum set of capabilities required to deliver measurable value for:
- restaurant marketers (Instagram planning and execution)
- menu analysts (profitability, pricing, and combo optimization)

Menuyukti is an AI-agentic application that serves two primary value paths:
- Restaurant marketers who need focused, insight-driven Instagram marketing decisions.
- Menu analysts who need data-driven menu improvement and marketing decisions (for example: combo offers, happy hour strategies, and item-level promote/improve/remove actions).

AI-agent outputs must remain grounded in deterministic, trustworthy analytics and explicit data-readiness guardrails.

This document reflects the current release state and defines what is required for a **minimum valuable product (MVP) release** today.

---

## 1. Product Success Metrics (Minimum)

MVP value must be demonstrated for both primary personas:
- Restaurant marketers receive actionable Instagram marketing decisions from AI-agentic workflows backed by trustworthy analytics.
- Menu analysts receive decision-grade profitability and mix insights from AI-agentic workflows backed by trustworthy analytics.

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

## 1B. MVP Scope Discipline (Simple, Smart, Elegant)

To keep MVP execution focused and avoid over-engineering, release scope is intentionally constrained to the minimum capabilities that deliver decision-grade value for marketers and analysts.

### Required MVP Features (Must Ship)
- Canonical decision contract shared by analytics pages and agent routes:
  - recommendation
  - rationale
  - confidence
  - readiness
  - evidence references
  - lineage/freshness context
- Deterministic analytics surfaces remain operational:
  - matrix
  - heatmap
  - pairs/combos
  - cogs
  - attribution
  - finance
- Instagram marketer execution flow:
  - scheduler planning
  - recommendation/suggestion to schedule flow
  - save/finalize with readiness guardrails
- Agentic workflow at MVP level:
  - agent reads canonical precomputed features
  - agent outputs include evidence references and confidence/readiness
  - quality/freshness guardrails block or downgrade low-trust outputs
- Reliability baseline:
  - upload -> ETL -> marts
  - idempotency + rejection logging
  - run lineage + quality status
  - deterministic seed/export support
- Focused release validation:
  - marketer and analyst critical-path E2E coverage
  - release docs/spec aligned to shipped behavior

### Explicit Non-Goals for MVP
- Advanced autonomous multi-agent orchestration loops.
- Full enterprise RBAC/governance hardening.
- Broad channel expansion beyond Instagram-focused marketer workflow.
- Complex long-horizon simulation/planning systems.
- Building generalized memory/RAG platform depth beyond MVP need.

### Document Boundary (Avoid Redundancy)
- `packages/docs/planning/SPECS.md` defines **what** MVP must deliver and how release-readiness is judged.
- `packages/docs/planning/archive/EPIC-AI-AGENTIC-DATA-CONTRACT-REFACTOR/epic-ai-agentic-data-contract-refactor.md` captures the completed data-contract refactor execution.
- `packages/docs/planning/todo/epic-ai-agentic-system.md` defines the next execution phase for advanced AI agentic capabilities.

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
- ETL run-history API contract documented (`packages/docs/contracts/ETL_RUNS_LIST_API_CONTRACT.md`).

### 2.5 Operations and Reliability
- Pipeline run tracking: `run_id`, status, duration, row counts, rejection counts.
- Deterministic stale-run detection and failure signaling for internal ETL runner lifecycle.
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
- Current release includes attribution overview UX, confidence tuning controls, scheduler drill-through, and analyst export support.

Note: Full end-user attribution UX is not release-blocking for MVP.

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
- Readiness-aware action menu in `/analytics/sales` with ordered workflow entry, badges, and dependency explanations.
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
- Cold-start E2E lifecycle runner can bootstrap required services, run DB setup/seed, execute suites, and reset DB post-run.

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
- `Implemented`: Dedicated ETL run-history list API supports succeeded/failed/queued/running views with deterministic filters and cursor pagination.
- `Implemented`: Operation queue runner internals claim queued jobs, transition lifecycle (`queued` -> `running` -> terminal), and resolve stale queued/running jobs for core ETL reliability.
- `Not Yet`: End-user retry/replay/backfill operations workflow is intentionally de-scoped from MVP release surface.
- `Implemented`: Lineage compatibility adapter + legacy backfill utility are available for staged pipeline rollout continuity.

### 11.2 Core Analytics and UI
- `Implemented`: Unified matrix table with robust filter bar, URL-based filter state, and presets.
- `Implemented`: Sales snapshot action dropdown now uses deterministic readiness statuses, badges, and dependency tooltips (`needs_cogs`, `needs_attribution_data`, `degraded`, `blocked`) in workflow order.
- `Implemented`: Action explainability reasons and matrix freshness/quality visibility on matrix page.
- `Implemented`: Daypart mart read endpoint.
- `Implemented`: Heatmap page now includes persona-oriented insight cards (marketer/analyst) with action-oriented summaries.
- `Implemented`: Heatmap trust/readiness and confidence-aware messaging is visible for execution decisions.
- `Implemented`: Heatmap filtering/segmentation controls support menu search, top rows, weekday/weekend context, and URL-shareable filter state.
- `Implemented`: Heatmap method notes/explainability panel clarifies deterministic interpretation boundaries.
- `Implemented`: Heatmap CSV export action is available from GUI and uses a documented contract.
- `Implemented`: Accessibility baseline improvements for matrix filters/table.
- `Implemented`: CSV export endpoint for analyst matrix/pair/combo/heatmap/attribution datasets with stable columns and metadata.
- `Implemented`: COGS page includes completeness KPI cards and prioritized missing/invalid watchlist for analyst remediation.
- `Implemented`: Matrix and matrix export include deterministic COGS readiness state/reasons based on coverage thresholds.
- `Implemented`: ETL run-history observability remains available via dedicated API contract (`/api/etl/runs`) for internal monitoring/reporting workflows.
- `Implemented`: Pair/combo analysis now has a dedicated GUI route with filter bar, KPI cards, ranked tables, explainability sheet, and secondary export actions.
- `Implemented`: Pair/combo GUI URL-based filter bar with typed state parsing/serialization and shareable query context.
- `Implemented`: Pair/combo tables support interactive column sorting directly in GUI.
- `Implemented`: Pair filter controls include in-context tooltips for Min sample size and Min lift.
- `Implemented`: Pair filter controls include tooltips for Min sample size, Min lift, Min confidence, and Sort by options.
- `Implemented`: Pair/combo marts, APIs, exports, and GUI now support deterministic `pair_type` classification (`food_drink`, `food_food`, `drink_drink`, `unknown`).
- `Implemented`: Combo scoring includes deterministic `food_drink` boost with explainable fields (`base_combo_opportunity_score`, `pair_type_boost_factor`, `pair_type_boost_applied`).
- `Implemented`: Weekly scheduler GUI route (`/analytics/{analyticsId}/scheduler`) supports week-scoped planning, recommendation-to-schedule flow, editable entries, and save/finalize actions.
- `Implemented`: Scheduler includes weekly heatmap suggestion rail with `Use Suggestion` action and deterministic fallback behavior when heatmap signals are unavailable.
- `Implemented`: Scheduler includes prefilled Post Composer with editable caption variants, CTA/hashtags inputs, and apply-to-schedule flow.

### 11.3 Marketer (Instagram) Capabilities
- `Implemented`: Recommendation-centric matrix workflow (`promote`, `improve/reprice`, `remove`, `keep`).
- `Implemented`: Legacy audience/tone agent routes were decommissioned for the new AI-agentic rebuild; dedicated decommission checks enforce `404` on retired endpoints.
- `Implemented`: Instagram campaign and post identity model with branch scope and publish-window query indexes.
- `Implemented`: Deterministic post-to-promoted-menu mapping model and idempotent mapping upsert API.
- `Implemented`: Weekly posting schedule and campaign planning loop are productized with persisted weekly schedules, entry-level editing, and readiness-aware trust states.
- `Implemented`: Instagram post generation from scheduler is productized with deterministic copy generation, draft guardrails, lifecycle APIs, and manual publish-package export.
- `Implemented`: Instagram attribution workflow is productized with overview UX, confidence policy/tuning, scheduler drill-through, and analyst export coverage.
- `Implemented`: Attribution KPI and delta revenue currency formatting is location-driven (`branches.currency_code`) with deterministic fallback when metadata is missing.

### 11.4 Menu Analyst Capabilities
- `Implemented`: Low-margin/high-volume style decisioning via matrix filters and presets.
- `Implemented`: Deterministic warehouse basket-pair fact table and idempotent per-run refresh SQL function.
- `Implemented`: Pair metrics mart and API with support, confidence, lift, minimum sample threshold, and noise flag.
- `Implemented`: Margin-aware combo opportunity scoring mart and ranked API for top-N analyst candidates.
- `Implemented`: Pair-type-aware analyst workflow: pair type filtering, pair type badges, and explainability of pair-type score adjustment.
- `Implemented`: Cost/price completeness workflow includes COGS coverage KPIs, impact-prioritized watchlist, matrix export completeness fields, and readiness policy visibility.

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
- `Implemented`: Release-gate E2E script covers marketer preset/recommendation flow, scheduler workflow, and analyst CSV export flow with artifacts.
- `Implemented`: Pair/combo GUI E2E journey validates filter application, explainability UI, and export link behavior.
- `Implemented`: Dedicated scheduler E2E journey validates weekly planner interactions, trust-state visibility, and draft-save outcomes.
- `Implemented`: Dedicated scheduler post-generation E2E journey validates suggestion-to-composer, apply-to-schedule, and save-draft flow.
- `Implemented`: Dedicated heatmap improvement E2E coverage validates filters, persona insight surfaces, and export behavior.
- `Implemented`: Dedicated attribution E2E workflow validates page load, confidence threshold URL state, and export behavior.
- `Implemented`: Dedicated COGS completeness E2E validates KPI/watchlist visibility and matrix export completeness/readiness columns.
- `Implemented`: E2E full lifecycle runner starts analytics/agents/web from down state, runs deterministic DB setup (`reset/gen/init/seed`), executes selected suites, then applies post-run DB reset.
- `Implemented`: Seed determinism smoke check (`db:seed:smoke`) is wired into the full lifecycle E2E gate before suite execution.
- `Implemented`: Per-suite E2E runner enforces service lifecycle for single-suite execution (starts missing services, runs suite, stops what it started).
- `Implemented`: Shared-service E2E batch runner supports multi-suite execution with one service lifecycle (start once, run many suites, stop once).
- `Implemented`: E2E data initialization policy is automated per suite (`reuse`/`seed`/`reset-seed`) with env override controls.
- `Implemented`: MVP release gate CI workflow runs `test:e2e:full` and preserves runner artifacts for failure recovery.
- `Implemented`: User manual chapters cover released heatmap, pair/combo, agent guardrail, and scheduler workflows with operational guidance.
- `Implemented`: User manual includes attribution workflow and confidence-tuning guidance.
- `Implemented`: User manual covers COGS completeness KPIs, watchlist usage, and readiness interpretation.
- `Implemented`: User manual includes cold-start E2E full lifecycle runner setup/guardrails/commands.

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
| 13 | COGS coverage support for analysts (MVP level) | Implemented | COGS update flow includes completeness KPI cards, prioritized watchlist, matrix export completeness fields, and readiness signals for analyst decisions. |
| 14 | Marketer action workflow (`promote/improve/remove`) | Implemented | Action-oriented matrix UX and presets are available. |
| 15 | Instagram campaign/post identity data model | Implemented | Canonical `instagram_campaigns` and `instagram_posts` with branch scope, identity fields, and publish-time indexes. |
| 16 | Post-to-promoted-menu mapping model + upsert API | Implemented | Canonical mapping table with idempotent write path and dedupe by normalized menu name. |
| 17 | Pair-menu analysis (support/confidence/lift) | Implemented | Pair metrics mart and API deliver support/confidence/lift with configurable sample threshold and noise flag. |
| 18 | Combo recommendation engine | Implemented | Margin-aware combo opportunity mart and ranked API endpoint are implemented. |
| 19 | Analyst CSV export (matrix/pairs/combos/heatmap/attribution) | Implemented | `/api/exports/analyst` exports filtered datasets with stable columns, confidence/trust metadata, and generation context. |
| 20 | Agent architecture using structured feature inputs + guardrails | Implemented | Agents invoke with structured `core_input`; readiness helper enforces block/downgrade behavior. |
| 21 | E2E upload -> analytics + release-gate workflows | Implemented | Upload, matrix, release-gate, and pair/combo e2e suites are wired with artifact capture. |
| 22 | Instagram weekly scheduler workflow (model/API/UI + readiness policy) | Implemented | Week-scoped schedule persistence, editable planner UI, confidence/rationale fields, and readiness-based block/downgrade behavior are implemented. |
| 23 | Scheduler E2E + release-gate integration | Implemented | Dedicated scheduler E2E and release-gate coverage validate draft-save and trust-state visibility behavior. |
| 24 | Heatmap persona insights/trust/explainability/filtering workflow | Implemented | Heatmap GUI includes persona cards, trust signals, explainability notes, segmentation controls, and shareable filter state. |
| 25 | Heatmap export contract + release-e2e + manual coverage | Implemented | Heatmap CSV export contract is documented; E2E and manual content are updated to release state. |
| 26 | Instagram attribution workflow (UI + confidence policy + scheduler linkage) | Implemented | Attribution overview UI, deterministic confidence tuning, scheduler drill-through outcomes, and location-driven currency rendering are implemented. |
| 27 | Attribution export contract + release-e2e + manual coverage | Implemented | Attribution dataset export contract, E2E coverage, and manual updates are implemented. |
| 28 | Retry/replay/backfill operations workflow + runbook + validation | Not Yet | Intentionally de-scoped from current MVP release surface; internal APIs are disabled for MVP mode. |
| 29 | ETL run-history observability (API contract + UI filters + detail/shortcuts) | Partial | `/api/etl/runs` API contract and filters are implemented; operations UI/shortcuts are removed from MVP surface. |
| 30 | ETL operation queue runner lifecycle and stale queue recovery | Implemented | Internal runner lifecycle and stale queue/running guardrails remain implemented for reliability hardening. |
| 31 | Sales action readiness flow (`/analytics/sales` dropdown badges + gating + reason tooltips) | Implemented | Actions are ordered by workflow and guarded by deterministic dependency statuses for COGS and attribution prerequisites. |
| 32 | Staged pipeline compatibility/backfill rollout utilities | Implemented | Legacy ETL jobs can be backfilled into staged lineage tables; compatibility toggle keeps API behavior stable during rollout. |
| 33 | Cold-start E2E full lifecycle runner (service bootstrap + DB lifecycle + suite execution + reset) | Implemented | `test:e2e:full` and `test:e2e:full:smoke` automate service orchestration, DB setup/cleanup, and deterministic suite execution with runner logs. |
| 34 | MVP CI release gate for full lifecycle E2E + seed determinism smoke | Implemented | CI workflow enforces `test:e2e:full`; runner executes `db:seed:smoke` before suites and keeps artifacts/reports for diagnostics. |
| 35 | Scheduler-to-post generation workflow (suggestions, composer, draft lifecycle, export, E2E) | Implemented | Weekly heatmap/matrix suggestions, prefilled composer, deterministic copy + guardrails, draft lifecycle/export APIs, and release E2E coverage are implemented. |

### 11.9 Open Features Backlog (All `Partial` + `Not Yet`, Not Release-Blocking for MVP)

| # | Post-MVP Capability | Status | Notes |
|---|---|---|---|
| H5 | Agent I/O contract governance hardening | Partial | Versioned contracts exist, but tighter governance for agent input/output schemas remains pending. |
| H6 | Tenant-boundary enforcement hardening beyond current scoping | Partial | Location/branch scoping exists in model/routes; formalized explicit tenant-boundary authz controls remain incomplete. |
| H7 | Full RBAC and explicit tenant authz controls | Not Yet | Location scoping exists; formal RBAC remains pending. |
| H8 | End-to-end audit trail for recommendation-affecting actions | Not Yet | Not fully implemented as a complete audit system. |
| H9 | Full retry/backfill runner handler execution parity | Not Yet | End-user operation handlers are de-scoped from MVP and remain a post-MVP capability. |

---

## 12. Next Epic: AI Agentic System (Post-MVP Build Focus)

Menuyukti's next phase is to become a category-defining AI agentic system for restaurant marketing (Instagram) and menu analytics, built on top of the now-stable deterministic data foundation.

Primary reference:
- `packages/docs/planning/todo/epic-ai-agentic-system.md`

### 12.1 Product Ambition
- Deliver an "AI decision operating system" rather than a summary assistant.
- Combine strategic reasoning, execution orchestration, and measurable outcomes.
- Keep trust as a hard requirement: evidence-linked, confidence-scored, readiness-governed outputs.

### 12.2 Cutting-Edge Capability Targets
- Instagram Growth Strategist Agent:
  - weekly objective-based campaign plans, posting windows, menu focus, CTA guidance.
- Menu Profit Intelligence Agent:
  - weekly action board with impact-ranked `promote/improve/bundle/deprioritize` recommendations.
- Multi-Agent Debate + Consensus:
  - upside/risk perspectives, consensus recommendation, disagreement rationale.
- What-If Simulation Studio:
  - scenario comparisons for cadence/promo/bundle strategies with confidence bands.
- Autonomous Weekly Decision Brief:
  - executive-ready marketer + analyst plan with prior-cycle outcome feedback.

### 12.3 Guardrails for Advanced Agentic Release
- Tool-first deterministic grounding for high-impact recommendations.
- Evidence thresholds and policy checks before finalize/publish-style actions.
- Output schema validation and auditability for every agent run.
- Cost controls via bounded context windows and cache-aware orchestration.

### 12.4 Post-MVP Story Direction
- AS-00: Legacy Audience/Tone Agent Decommission and Route Cleanup
- AS-01: Agent Workflow Blueprint and Persona Journey Maps
- AS-02: Agent Tool Contract v1 and Runtime Policy
- AS-03: Marketer Agent (Instagram Planning Copilot)
- AS-04: Analyst Agent (Menu Decision Copilot)
- AS-05: Multi-Agent Debate and Consensus Engine
- AS-06: Scenario Simulation and What-If Evaluation
- AS-07: Agent Memory, Recommendation Tracking, and Feedback Signals
- AS-08: Agent Guardrails, Evaluation Harness, and Release Gate
- AS-09: Learning Data Model and Outcome Signal Capture
- AS-10: Recommendation Re-Ranking from Outcome Feedback
- AS-11: Safe Learning Release Loop (Shadow -> Canary -> Rollout)

Transition note:
- AS-00 is required before new agent implementation to remove legacy audience/tone agent surface and prevent architecture drift during the rebuild.
- Self-learning is delivered via AS-09/AS-10/AS-11 with policy-gated rollout, explicit evaluation thresholds, and rollback controls.
