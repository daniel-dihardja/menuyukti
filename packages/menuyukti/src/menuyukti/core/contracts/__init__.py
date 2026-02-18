"""Canonical contract models for marketing engine payloads."""

from menuyukti.core.contracts.adapters import (
    to_core_distribution,
    to_core_heatmap,
    to_core_matrix_item,
    to_core_sales_summary,
)
from menuyukti.core.contracts.metadata import build_metadata_v1
from menuyukti.core.contracts.v1 import (
    CategoryDistributionV1,
    ContractMetadataV1,
    HourlyDemandV1,
    MatrixDistributionV1,
    MatrixItemV1,
    MenuHeatmapV1,
    SalesAnalyticsSummaryV1,
    WeeklyDemandV1,
)

__all__ = [
    "ContractMetadataV1",
    "HourlyDemandV1",
    "WeeklyDemandV1",
    "MenuHeatmapV1",
    "CategoryDistributionV1",
    "MatrixDistributionV1",
    "MatrixItemV1",
    "SalesAnalyticsSummaryV1",
    "to_core_matrix_item",
    "to_core_heatmap",
    "to_core_distribution",
    "to_core_sales_summary",
    "build_metadata_v1",
]
