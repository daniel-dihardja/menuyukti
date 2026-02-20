from __future__ import annotations

from collections.abc import Mapping
from datetime import date

from menuyukti.indicators.contracts.v1 import (
    ContractEnvelopeV1,
    ContractMetadataV1,
    MatrixDistributionV1,
    MenuMatrixPayloadV1,
    MatrixItemV1,
    MenuHeatmapV1,
    SalesAnalyticsPayloadV1,
    SalesAnalyticsSummaryV1,
)
from menuyukti.indicators.contracts.metadata import build_metadata_v1
from menuyukti.indicators.models.heatmap import HourlyDemand, MenuHeatmap, WeeklyDemand
from menuyukti.indicators.models.matrix_distribution import (
    CategoryDistribution,
    MatrixDistribution,
)
from menuyukti.indicators.models.matrix_item import MatrixItem
from menuyukti.indicators.models.sales_analytics_summary import (
    PopularityIndexRow,
    SalesAnalyticsSummary,
)

JsonMapping = Mapping[str, object]


def _format_reporting_period(period_start: date | None) -> str:
    if not period_start:
        return "unknown"
    return period_start.strftime("%Y-%m")


def _as_mapping(payload: object, *, field_name: str) -> JsonMapping:
    if isinstance(payload, Mapping):
        return payload
    raise TypeError(f"{field_name} must be a mapping")


def to_core_matrix_item(payload: JsonMapping) -> MatrixItem:
    canonical = MatrixItemV1.model_validate(payload)
    return MatrixItem(**canonical.model_dump())


def to_core_heatmap(
    payload: JsonMapping,
    period_start: date | None = None,
) -> MenuHeatmap:
    canonical = MenuHeatmapV1.model_validate(payload)
    reporting_period = canonical.reporting_period or _format_reporting_period(period_start)
    return MenuHeatmap(
        menu=canonical.menu,
        menu_category=canonical.menu_category,
        menu_category_detail=canonical.menu_category_detail,
        daily_heatmap=[
            HourlyDemand(hour=row.hour, quantity=row.quantity)
            for row in canonical.daily_heatmap
        ],
        weekly_heatmap=[
            WeeklyDemand(day=row.day, quantity=row.quantity)
            for row in canonical.weekly_heatmap
        ],
        reporting_period=reporting_period,
    )


def to_core_distribution(payload: JsonMapping) -> MatrixDistribution:
    canonical = MatrixDistributionV1.model_validate(payload)
    return MatrixDistribution(
        categories=[
            CategoryDistribution(
                category=row.category,
                item_count=row.item_count,
                item_share=row.item_share,
                margin_share=row.margin_share,
            )
            for row in canonical.categories
        ]
    )


def to_core_sales_summary(payload: JsonMapping) -> SalesAnalyticsSummary:
    canonical = SalesAnalyticsSummaryV1.model_validate(payload)
    return SalesAnalyticsSummary(
        total_orders=canonical.total_orders,
        total_items_sold=canonical.total_items_sold,
        total_revenue=canonical.total_revenue,
        avg_order_revenue=canonical.avg_order_revenue,
        max_order_revenue=canonical.max_order_revenue,
        min_order_revenue=canonical.min_order_revenue,
        avg_order_items=canonical.avg_order_items,
        max_order_items=canonical.max_order_items,
        min_order_items=canonical.min_order_items,
        avg_popularity_threshold=canonical.avg_popularity_threshold,
        popularity_index=[
            PopularityIndexRow(**row.model_dump())
            for row in canonical.popularity_index
        ],
        period_start=canonical.period_start.isoformat(),
        period_end=canonical.period_end.isoformat(),
    )


def to_sales_analytics_envelope_v1(payload: JsonMapping) -> ContractEnvelopeV1:
    raw_metadata = _as_mapping(payload.get("metadata", {}), field_name="metadata")
    metadata = ContractMetadataV1.model_validate(raw_metadata)
    domain_payload = SalesAnalyticsPayloadV1.model_validate(
        {
            key: value
            for key, value in payload.items()
            if key != "metadata"
        }
    )
    return ContractEnvelopeV1(
        contract_type="sales_analytics",
        metadata=metadata,
        payload=domain_payload,
    )


def to_menu_matrix_envelope_v1(
    payload: JsonMapping,
    *,
    metadata: Mapping[str, str] | None = None,
    source_system: str = "api",
) -> ContractEnvelopeV1:
    resolved_metadata = metadata if metadata is not None else build_metadata_v1(source_system=source_system)
    envelope_metadata = ContractMetadataV1.model_validate(resolved_metadata)
    domain_payload = MenuMatrixPayloadV1.model_validate(payload)
    return ContractEnvelopeV1(
        contract_type="menu_matrix",
        metadata=envelope_metadata,
        payload=domain_payload,
    )
