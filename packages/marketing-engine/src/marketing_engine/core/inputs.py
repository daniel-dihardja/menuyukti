from __future__ import annotations

from pydantic import BaseModel

from marketing_engine.core.models.matrix_item import MatrixItem
from marketing_engine.core.models.heatmap import MenuHeatmap
from marketing_engine.core.models.matrix_distribution import MatrixDistribution
from marketing_engine.core.models.sales_analytics_summary import (
    SalesAnalyticsSummary,
)


class CoreInputs(BaseModel):
    """
    Immutable core inputs for all marketing agents.

    `sales_summary` is optional to preserve backward compatibility with
    existing callers, but recommended for audience-oriented agents that need
    order/revenue context.
    """

    matrix_items: list[MatrixItem]
    heatmaps: list[MenuHeatmap]
    distribution: MatrixDistribution
    sales_summary: SalesAnalyticsSummary | None = None
