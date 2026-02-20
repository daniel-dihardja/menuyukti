from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

MatrixCategory = Literal["star", "puzzle", "plow_horse", "low_end"]
Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DecisionAction = Literal["keep", "reprice", "promote", "remove"]


class ContractMetadataV1(BaseModel):
    schema_version: str = "v1"
    source_system: str
    pipeline_run_id: str
    ingested_at_utc: datetime
    quality_status: str


class HourlyDemandV1(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    hour: int = Field(
        ge=0,
        le=23,
        validation_alias=AliasChoices("hour"),
    )
    quantity: int = Field(ge=0)


class WeeklyDemandV1(BaseModel):
    day: Weekday
    quantity: int = Field(ge=0)


class MenuHeatmapV1(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    menu: str
    menu_category: str = Field(
        validation_alias=AliasChoices("menu_category", "menuCategory"),
    )
    menu_category_detail: str = Field(
        validation_alias=AliasChoices("menu_category_detail", "menuCategoryDetail"),
    )
    daily_heatmap: list[HourlyDemandV1] = Field(
        validation_alias=AliasChoices("daily_heatmap", "dailyHeatmap"),
    )
    weekly_heatmap: list[WeeklyDemandV1] = Field(
        validation_alias=AliasChoices("weekly_heatmap", "weeklyHeatmap"),
    )
    reporting_period: str | None = None


class CategoryDistributionV1(BaseModel):
    category: MatrixCategory
    item_count: int = Field(
        ge=0,
        validation_alias=AliasChoices("item_count", "count"),
    )
    item_share: float = Field(
        ge=0,
        le=1,
        validation_alias=AliasChoices("item_share", "percentage"),
    )
    margin_share: float = Field(
        ge=0,
        le=1,
        validation_alias=AliasChoices(
            "margin_share",
            "margin_contribution_percentage",
        ),
    )


class MatrixDistributionV1(BaseModel):
    categories: list[CategoryDistributionV1]


class MatrixItemV1(BaseModel):
    menu: str
    menu_category: str
    menu_category_detail: str
    category: MatrixCategory
    action: DecisionAction

    quantity: int = Field(ge=0)
    total_revenue: float = Field(ge=0)

    cogs: float = Field(ge=0)
    total_cogs: float = Field(ge=0)

    margin_per_unit: float
    contribution_margin: float
    contribution_margin_percentage: float = Field(ge=0, le=1)
    we_value: float


class PopularityIndexRowV1(BaseModel):
    menu: str
    popularity: float = Field(ge=0, le=1)
    quantity: int = Field(ge=0)


class SalesAnalyticsSummaryV1(BaseModel):
    total_orders: int
    total_items_sold: int
    total_revenue: float

    avg_order_revenue: float
    max_order_revenue: float
    min_order_revenue: float

    avg_order_items: float
    max_order_items: int
    min_order_items: int

    avg_popularity_threshold: float = Field(
        validation_alias=AliasChoices("avg_popularity_threshold", "avg_popularity"),
        serialization_alias="avg_popularity_threshold",
    )
    popularity_index: list[PopularityIndexRowV1] = Field(default_factory=list)

    period_start: date
    period_end: date


class SalesAnalyticsPayloadV1(BaseModel):
    total_orders: int
    total_items_sold: int
    total_revenue: float

    avg_order_revenue: float
    max_order_revenue: float
    min_order_revenue: float

    avg_order_items: float
    max_order_items: int
    min_order_items: int

    avg_popularity_threshold: float = Field(
        validation_alias=AliasChoices("avg_popularity_threshold", "avg_popularity"),
        serialization_alias="avg_popularity_threshold",
    )
    popularity_index: list[PopularityIndexRowV1] = Field(default_factory=list)
    menu_heatmaps: list[MenuHeatmapV1] = Field(default_factory=list)

    period_start: date
    period_end: date


class MatrixThresholdsV1(BaseModel):
    avg_popularity: float
    avg_contribution_margin: float
    total_cogs: float
    total_profit: float
    total_margin: float


class MenuMatrixPayloadV1(BaseModel):
    thresholds: MatrixThresholdsV1
    distribution: list[CategoryDistributionV1] = Field(default_factory=list)
    items: list[MatrixItemV1] = Field(default_factory=list)


class ContractEnvelopeV1(BaseModel):
    contract_version: Literal["v1"] = "v1"
    contract_type: Literal["sales_analytics", "menu_matrix"]
    metadata: ContractMetadataV1
    payload: SalesAnalyticsPayloadV1 | MenuMatrixPayloadV1
