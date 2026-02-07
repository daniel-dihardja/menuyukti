from __future__ import annotations

from pydantic import BaseModel
from intelligence.models.matrix_item import MatrixItem
from intelligence.models.heatmap import MenuHeatmap

from intelligence.primitives.economic_primitives import EconomicPrimitives
from intelligence.primitives.behavioral_primitives import BehavioralPrimitives


class EnrichedMenuItem(BaseModel):
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

    class Config:
        frozen = True

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
