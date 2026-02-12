"""Shared primitives for marketing engines."""

from __future__ import annotations

from pydantic import BaseModel

from marketing_engine.core.inputs import CoreInputs
from marketing_engine.shared.primitives.behavioral_primitives import BehavioralPrimitives
from marketing_engine.shared.primitives.economic_primitives import EconomicPrimitives
from marketing_engine.shared.primitives.structural_primitives import StructuralPrimitives


class SharedPrimitives(BaseModel):
    """
    Shared primitives that can be reused by multiple agents.
    """

    structural: StructuralPrimitives
    economic_by_menu: dict[str, EconomicPrimitives]
    behavioral_by_menu: dict[str, BehavioralPrimitives]


def build_shared_primitives(core: CoreInputs) -> SharedPrimitives:
    """
    Compute shared primitives once from core inputs.
    """

    # Local imports to avoid circular dependencies during package init.
    from marketing_engine.shared.engines.behavioral_engine import (
        compute_behavioral_primitives,
    )
    from marketing_engine.shared.engines.economic_engine import (
        compute_economic_primitives,
    )
    from marketing_engine.shared.engines.structural_engine import (
        compute_structural_primitives,
    )

    structural = compute_structural_primitives(core.distribution)

    economic_by_menu: dict[str, EconomicPrimitives] = {}
    behavioral_by_menu: dict[str, BehavioralPrimitives] = {}

    heatmap_by_menu = {h.menu: h for h in core.heatmaps}

    for item in core.matrix_items:
        economic_by_menu[item.menu] = compute_economic_primitives(
            item,
            core.matrix_items,
        )
        heatmap = heatmap_by_menu.get(item.menu)
        if heatmap:
            behavioral_by_menu[item.menu] = compute_behavioral_primitives(heatmap)

    return SharedPrimitives(
        structural=structural,
        economic_by_menu=economic_by_menu,
        behavioral_by_menu=behavioral_by_menu,
    )
