"""Canonical contract models for marketing engine payloads."""

from marketing_engine.core.contracts.v1 import (
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
]
