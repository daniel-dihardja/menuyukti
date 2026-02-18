# Menuyukti Package

## Purpose

Menuyukti converts restaurant sales data into structured, deterministic outputs for analytics and agent consumers.

It is intentionally deterministic and contract-first.

## Package Structure

- `core/`: Input models and core data wiring.
- `core/analytics/`: Deterministic analytics transforms.
- `core/contracts/`: Versioned compatibility models and adapters.

## Typical Flow

1. Build `CoreInputs` from matrix items, distribution, heatmaps, and optional sales summary metrics.
2. Pass canonical inputs to downstream consumers (analytics APIs, agents routes, or contract adapters).

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
  `CORE_INPUT_HEATMAP_MENU_UNKNOWN`,
  `CORE_MODEL_DUPLICATE_CATEGORY_DISTRIBUTION`)

Normalization behavior:

- `matrix_items`, `heatmaps`, and `distribution.categories` are sorted deterministically
- equivalent input payloads produce stable serialized ordering between runs

## Key Entry Points

```python
from menuyukti.core.inputs import CoreInputs
from menuyukti.core.models.sales_analytics_summary import SalesAnalyticsSummary
from menuyukti.core.contracts.adapters import (
    to_core_heatmap,
    to_sales_analytics_envelope_v1,
    to_menu_matrix_envelope_v1,
)
```

## Example Usage (Step-by-Step)

```python
from menuyukti.core.inputs import CoreInputs
from menuyukti.core.models.sales_analytics_summary import SalesAnalyticsSummary
from menuyukti.core.contracts.adapters import to_core_distribution

# 1) Build core inputs from your validated data
# These are the canonical, validated inputs that all downstream layers rely on.
# If you already have `calculate_sales_analytics` output, pass it as sales_summary.
sales_summary = SalesAnalyticsSummary(**sales_analytics_payload)
core = CoreInputs(
    matrix_items=matrix_items,
    heatmaps=heatmaps,
    distribution=distribution,
    sales_summary=sales_summary,
)

# 2) Optional compatibility adapters (legacy payload -> canonical models)
legacy_distribution_payload = {
    "categories": [{"category": "star", "count": 3, "percentage": 0.5, "margin_contribution_percentage": 0.7}]
}
distribution_model = to_core_distribution(legacy_distribution_payload)

# 3) Contract-safe, versioned envelope for downstream consumers
sales_envelope = to_sales_analytics_envelope_v1(sales_analytics_payload)
matrix_envelope = to_menu_matrix_envelope_v1(matrix_payload, source_system="api")
```

## Notes

- This package now focuses on canonical analytics models, transforms, and contract adapters.
- Audience-specific implementation was decommissioned as part of ME-03 cleanup.
- `ContractEnvelopeV1` (`contract_version`, `contract_type`, `metadata`, `payload`) is the stable envelope for machine consumers.
