---
name: menuyukti-analytics
description: >-
  Author and consume analytics in packages/menuyukti: DataFrame contracts, calculate_*/compute_*_from_orders
  pipelines, Instagram signal composition, weekly demand patterns, and boundaries with apps/graphql. Use when
  adding or changing sales analytics, category mix, revenue trends, menu engineering, operating profile,
  weekly demand, or agent-facing analytics payloads. For pandas pipelines and Python structure, also use
  pandas-pro and python-design-patterns (see Companion skills).
---

# Menuyukti analytics (`packages/menuyukti`)

This skill is for **Cursor/agents** working on the **shared Python package** [`packages/menuyukti`](../../../packages/menuyukti). Runtime milestone prompts for agents live under `apps/agents/.../milestone_run/skills/`, not this package.

## Companion skills

When implementing in **`packages/menuyukti` analytics**, follow these skills in addition to this doc.

- [`pandas-pro`](../pandas-pro/SKILL.md) — DataFrame manipulation, cleaning, aggregation, merges, and performance (vectorized patterns align with conventions here).
- [`python-design-patterns`](../python-design-patterns/SKILL.md) — Layering, single responsibility, composition over inheritance, and keeping calculate/compute boundaries clear.

## Where the code lives

| Area                    | Path                                                                                                                                                                   | Role                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Analytics modules**   | [`packages/menuyukti/src/menuyukti/core/analytics/`](../../../packages/menuyukti/src/menuyukti/core/analytics/)                                                        | Pandas pipelines + pure composition                                                        |
| **Registry / helpers**  | [`registry.py`](../../../packages/menuyukti/src/menuyukti/core/analytics/registry.py), [`utils.py`](../../../packages/menuyukti/src/menuyukti/core/analytics/utils.py) | Shared registration or utilities where used                                                |
| **ESB ingest**          | [`packages/menuyukti/src/menuyukti/core/analytics/esb/`](../../../packages/menuyukti/src/menuyukti/core/analytics/esb/)                                                | Normalization paths for supported ingest formats                                           |
| **Line-item model**     | [`packages/menuyukti/src/menuyukti/core/models/pos_transaction.py`](../../../packages/menuyukti/src/menuyukti/core/models/pos_transaction.py)                          | `POSTransactionLineItem` column names                                                      |
| **Unit tests**          | [`packages/menuyukti/tests/unit/core/analytics/`](../../../packages/menuyukti/tests/unit/core/analytics/)                                                              | Pytest for `calculate_*` / `compute_*`                                                     |
| **GraphQL integration** | [`apps/graphql/reports/transform.py`](../../../apps/graphql/reports/transform.py)                                                                                      | Maps ingest rows → DataFrame → `calculate_*` (do **not** build ad hoc frames in resolvers) |

**Agents** (`apps/agents`) call **GraphQL over HTTP**; they do **not** import this package directly. New **HTTP-facing** shapes belong in GraphQL after the package API is stable — see [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md).

## Public pipelines (summary)

| Function / entrypoint                       | Input                                           | Output idea                                       |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| `calculate_sales_analytics`                 | Full line-item frame                            | Totals, popularity, heatmaps, period              |
| `calculate_menu_heatmaps`                   | `menu`, `qty`, `order_time`, …                  | Per-menu hourly/weekly grids                      |
| `compute_operating_profile_from_orders`     | Bill-level rows + optional holidays             | Meal periods, DOW, labels                         |
| `calculate_menu_engineering_matrix`         | Menu-level revenue + COGS                       | Star / plow_horse / puzzle / low_end              |
| `compute_menu_engineering_from_orders`      | Typed order rows                                | Delegates to `calculate_menu_engineering_matrix`  |
| `calculate_category_mix`                    | Line items with optional categories             | Revenue/qty share per category                    |
| `calculate_revenue_trends`                  | Current vs previous period frames               | Deltas, ranks, trend labels                       |
| `calculate_weekly_demand_pattern`           | Line-item frame (ISO week indices)              | Revenue/tx indices vs location mean               |
| `compute_weekly_demand_pattern_from_orders` | Typed order rows                                | Delegates to `calculate_weekly_demand_pattern`    |
| `calculate_popularity_index`                | Frame per `popularity_index_columns`            | Popularity scoring where used                     |
| `calculate_instagram_signals`               | **Precomputed** dicts/results only              | Heroes, trending, avoid, posting window, headline |
| `extract_menu_items`                        | Line-item DataFrame (`menu`, `qty`, `price`, …) | Aggregated per-menu facts for analytics           |
| `detect_pos_from_excel_bytes`               | Raw bytes                                       | POS flavor hint for ingest                        |

Authoritative exports: [`analytics/__init__.py`](../../../packages/menuyukti/src/menuyukti/core/analytics/__init__.py) (`__all__`).

## Conventions (must follow)

1. **`TypedDict`** for line-level inputs lives **next to** the module that consumes it (`OrderRowForHeatmap`, `OrderRowForCategoryMix`, …).
2. **`calculate_<name>(df)`** starts with **`require_columns(df, <name>_columns(), context="calculate_<name>")`** (or `line_item_columns_full()` / `ensure_optional_category_columns` where categories are optional).
3. **`compute_<name>_from_orders(rows)`** builds `pd.DataFrame(rows)` and calls `calculate_<name>`; empty inputs: raise `ValueError` or return an empty structured result **consistently** with sibling modules.
4. **Vectorized pandas** — groupby/merge/resample; avoid `iterrows` for aggregations (see Companion skills — [pandas-pro](../pandas-pro/SKILL.md)).
5. **Composition-only** modules (e.g. `calculate_instagram_signals`) take **structured results**, not raw `DataFrame`s — no pandas inside those files.

Details: [`analytics/__init__.py`](../../../packages/menuyukti/src/menuyukti/core/analytics/__init__.py) module docstring and [`frame_contracts.py`](../../../packages/menuyukti/src/menuyukti/core/analytics/frame_contracts.py).

## Instagram agent flow

```mermaid
flowchart LR
  rows[Order rows]
  rows --> cat[calculate_category_mix]
  rows --> trend[calculate_revenue_trends]
  rows --> sales[calculate_sales_analytics]
  rows --> op[compute_operating_profile_from_orders]
  rows --> me[compute_menu_engineering_from_orders]
  cat --> sig[calculate_instagram_signals]
  trend --> sig
  sales --> sig
  op --> sig
  me --> sig
```

`calculate_instagram_signals` expects **already computed** `CategoryMixResult`, `RevenueTrendsResult`, the **dict** from `calculate_sales_analytics`, optional `OperatingProfileResult`, and optional `MenuEngineeringMatrixResult` (omit when COGS is unavailable).

Returned lists (`content_heroes`, `avoid_items`, `trending_items`) are **top-N capped** for API/LLM size; full matrix input is unchanged.

## Progressive disclosure

If this file grows, split long API tables into `reference.md` in this folder.

## Related

- [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md) — monorepo boundaries, pnpm vs uv.
- [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md) — Strawberry layer and `reports/transform` integration.
- [`menuyukti-agents`](../menuyukti-agents/SKILL.md) — milestone run tools may call GraphQL payloads derived from this package.
