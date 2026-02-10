# Marketing Engine

## Purpose

The marketing engine converts core restaurant sales data into structured outputs that downstream agents can use to generate marketing insights and schedules.

It is intentionally deterministic where possible, and keeps agent logic thin and explainable.

## Package Structure

- `core/`: Input models and core data wiring.
- `shared/`: Shared primitives and primitive engines used across features/decisions.
- `features/`: Agent-specific feature builders (plugin-style registry).
- `decision/`: Deterministic promotion decisions and scheduling logic.
- `pipeline.py`: High-level entry point to build promotion candidates.

## Typical Flow

1. Build `CoreInputs` from matrix items, distribution, and heatmaps.
2. Generate shared primitives if needed.
3. Use feature providers (e.g. audience) for agent-specific data.
4. Use the decision pipeline and scheduler when you need post scheduling.

## Key Entry Points

```python
from app.marketing_engine.core.inputs import CoreInputs
from app.marketing_engine.shared.primitives import build_shared_primitives
from app.marketing_engine.features import load_default_providers, build_features
from app.marketing_engine.pipeline import build_promotion_candidates
from app.marketing_engine.decision.allocation.promotion_scheduler import PromotionScheduler
```

## Example Usage (Step-by-Step)

```python
from app.marketing_engine.core.inputs import CoreInputs
from app.marketing_engine.shared.primitives import build_shared_primitives
from app.marketing_engine.features import load_default_providers, build_features
from app.marketing_engine.pipeline import build_promotion_candidates
from app.marketing_engine.decision.allocation.promotion_scheduler import PromotionScheduler

# 1) Build core inputs from your validated data
# These are the canonical, validated inputs that all downstream layers rely on.
core = CoreInputs(
    matrix_items=matrix_items,
    heatmaps=heatmaps,
    distribution=distribution,
)

# 2) Shared primitives (optional but useful across agents)
# Compute reusable facts such as economic strength, behavioral peaks, and portfolio health.
shared = build_shared_primitives(core)

# 3) Feature system (agent-specific)
# Load built-in providers into the registry and request the audience feature set.
load_default_providers()
audience_features = build_features("audience", core, shared)

# 4) Decision pipeline + scheduler (for posting calendar)
# Convert raw inputs into ranked promotion candidates, then schedule into a weekly plan.
portfolio, candidates = build_promotion_candidates(
    matrix_items=core.matrix_items,
    heatmaps=core.heatmaps,
    distribution=core.distribution,
)

scheduler = PromotionScheduler()
weekly_schedule = scheduler.build_weekly_schedule(candidates)
```

### Example Output (What You Get)

After Step 3 you have a structured `AudienceFeatures` object:

- `top_items`: top-selling menu items (used to choose what to highlight)
- `peak_hours`: best hours to post (used for timing)
- `weekday_bias`: whether the business skews weekday or weekend

After Step 4 you have:

- `candidates`: ranked promotion opportunities with reasons and priority
- `weekly_schedule`: a deterministic weekly Instagram posting plan

## Features Concept

Features are **agent-specific, derived datasets** built from the same core inputs.

Think of them as “views” over the core data:

- **core inputs** = raw, validated data
- **shared primitives** = common derived facts (reused across agents)
- **features** = agent-specific transformations for a particular task

### Provider Loading

By default the registry is empty. Call `load_default_providers()` to import
the built-in feature modules so their registration side-effects run:

```python
from app.marketing_engine.features import load_default_providers

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
- The decision layer is optional if you only need audience or content insights.
