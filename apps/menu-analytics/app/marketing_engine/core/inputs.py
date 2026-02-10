from __future__ import annotations

from pydantic import BaseModel

from app.marketing_engine.core.models.matrix_item import MatrixItem
from app.marketing_engine.core.models.heatmap import MenuHeatmap
from app.marketing_engine.core.models.matrix_distribution import MatrixDistribution


class CoreInputs(BaseModel):
    """
    Immutable core inputs for all marketing agents.
    """

    matrix_items: list[MatrixItem]
    heatmaps: list[MenuHeatmap]
    distribution: MatrixDistribution
