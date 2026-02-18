# Menuyukti Package

## Purpose

The marketing engine converts core restaurant sales data into structured outputs that downstream agents can use to generate marketing insights and schedules.

It is intentionally deterministic where possible, and keeps agent logic thin and explainable.

## Package Structure

- `core/`: Input models and core data wiring.
- `features/`: Agent-specific feature builders (plugin-style registry).

## Typical Flow

1. Build `CoreInputs` from matrix items, distribution, heatmaps, and optional sales summary metrics.
2. Use feature providers (e.g. audience) for agent-specific data.

## Core Input Contract (ME-01)

`CoreInputs` is now a strict canonical contract:

- `matrix_items`: required, non-empty
- `heatmaps`: required, non-empty
- `distribution`: required, no duplicate category entries
- `sales_summary`: optional (`None` by default)
- extra/unknown fields are rejected

Validation behavior:

- every matrix item must have a matching heatmap menu
- distribution categories must be unique (`star`, `puzzle`, `plow_horse`, `low_end`)
- invalid payloads raise code-prefixed errors (for example:
  `CORE_INPUT_HEATMAP_MISSING_FOR_MATRIX_ITEM`,
  `CORE_INPUT_DISTRIBUTION_DUPLICATE_CATEGORY`)

Normalization behavior:

- `matrix_items`, `heatmaps`, and `distribution.categories` are sorted deterministically
- equivalent input payloads produce stable serialized ordering between runs

## Key Entry Points

```python
from menuyukti.core.inputs import CoreInputs
from menuyukti.core.models.sales_analytics_summary import SalesAnalyticsSummary
from menuyukti.features import load_default_providers, build_features
```

## Example Usage (Step-by-Step)

```python
from menuyukti.core.inputs import CoreInputs
from menuyukti.core.models.sales_analytics_summary import SalesAnalyticsSummary
from menuyukti.features import load_default_providers, build_features

# 1) Build core inputs from your validated data
# These are the canonical, validated inputs that all downstream layers rely on.
# If you already have `calculate_sales_analytics` output, pass it as sales_summary.
sales_summary = SalesAnalyticsSummary(**sales_analytics_payload)
core = CoreInputs(
    matrix_items=matrix_items,
    heatmaps=heatmaps,
    distribution=distribution,
    sales_summary=sales_summary,  # optional but recommended for audience agents
)

# 2) Feature system (agent-specific)
# Load built-in providers into the registry and request the audience feature set.
load_default_providers()
audience_features = build_features("audience", core)
```

### Example Output (What You Get)

After Step 3 you have a structured `AudienceFeatures` object:

- `top_items`: top-selling menu items (used to choose what to highlight)
- `peak_hours`: best hours to post (used for timing)
- `weekday_bias`: whether the business skews weekday or weekend
- `daypart_profile` and `weekday_profile`: normalized demand distributions
- `party_size_signal` and `social_dining_score`: audience context signals from basket depth
- `avg_order_items`, `avg_order_revenue`, `top_item_revenue_share_ratio`: spend/context signals
- `popularity_index_coverage`, `primary_category`, `analysis_window_days`, `intent_hints`: helper features for downstream agents

## Features Concept

Features are **agent-specific, derived datasets** built from the same core inputs.

Think of them as “views” over the core data:

- **core inputs** = raw, validated data (matrix/heatmap/distribution + optional sales summary)
- **features** = agent-specific transformations for a particular task

### Provider Loading

By default the registry is empty. Call `load_default_providers()` to import
the built-in feature modules so their registration side-effects run:

```python
from menuyukti.features import load_default_providers

load_default_providers()
```

This keeps startup light and avoids importing every feature unless needed.

### Registry

The registry is a simple in-memory map of `provider_name -> provider_instance`.
It lets the engine request features by name without hard-coding imports.

This keeps the engine modular:

- Agents remain focused on their job
- Feature logic is reusable and testable
- New agents can plug in without touching core logic

## Notes

- Feature providers are registered via `load_default_providers()` or by importing their module directly.
- This package now focuses on canonical analytics + feature generation.
