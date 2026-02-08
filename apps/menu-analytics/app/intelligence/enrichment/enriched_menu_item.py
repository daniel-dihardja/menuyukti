from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from app.intelligence.models.matrix_item import MatrixItem
from app.intelligence.models.heatmap import MenuHeatmap

from app.intelligence.primitives.economic_primitives import EconomicPrimitives
from app.intelligence.primitives.behavioral_primitives import BehavioralPrimitives


class EnrichedMenuItem(BaseModel):
    model_config = ConfigDict(frozen=True)
    """
    Decision-ready representation of a menu item.

    Combines:
        - raw economic state
        - observed demand behavior
        - deterministic primitives

    This object becomes the PRIMARY input
    for roles, signals, and promotion decisions.
    """

    matrix: MatrixItem
    heatmap: MenuHeatmap

    economic: EconomicPrimitives
    behavioral: BehavioralPrimitives

    @staticmethod
    def enrich_menu_item(
        matrix_item: MatrixItem,
        heatmap: MenuHeatmap,
        economic: EconomicPrimitives,
        behavioral: BehavioralPrimitives,
    ) -> EnrichedMenuItem:

        return EnrichedMenuItem(
            matrix=matrix_item,
            heatmap=heatmap,
            economic=economic,
            behavioral=behavioral,
        )
