from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from menuyukti.indicators.models.matrix_item import MatrixItem
from menuyukti.indicators.models.heatmap import MenuHeatmap
from menuyukti.indicators.models.matrix_distribution import MatrixDistribution
from menuyukti.core.models.sales_analytics_summary import (
    SalesAnalyticsSummary,
)


class CoreInputs(BaseModel):
    """
    Immutable core inputs for all marketing agents.

    `sales_summary` is optional to preserve backward compatibility with
    existing callers, but recommended when downstream decision logic needs
    order/revenue context.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    matrix_items: list[MatrixItem] = Field(min_length=1)
    heatmaps: list[MenuHeatmap] = Field(min_length=1)
    distribution: MatrixDistribution
    sales_summary: SalesAnalyticsSummary | None = None

    @model_validator(mode="after")
    def validate_and_normalize(self) -> "CoreInputs":
        matrix_menu_set = {item.menu for item in self.matrix_items}
        heatmap_menu_set = {item.menu for item in self.heatmaps}

        # Guard against detached heatmap rows that do not map to any matrix item.
        unknown_heatmaps = sorted(heatmap_menu_set - matrix_menu_set)
        if unknown_heatmaps:
            joined = ", ".join(unknown_heatmaps[:5])
            raise ValueError(
                f"CORE_INPUT_HEATMAP_MENU_UNKNOWN: heatmap menu(s) missing in matrix_items: {joined}"
            )

        # Core input contract guard: no duplicate distribution categories.
        seen_categories: set[str] = set()
        duplicate_categories: list[str] = []
        for category in self.distribution.categories:
            if category.category in seen_categories:
                duplicate_categories.append(category.category)
            seen_categories.add(category.category)
        if duplicate_categories:
            duplicates = ", ".join(sorted(set(duplicate_categories)))
            raise ValueError(
                f"CORE_INPUT_DISTRIBUTION_DUPLICATE_CATEGORY: duplicate category entries: {duplicates}"
            )

        # Normalize ordering so repeated equivalent payloads serialize deterministically.
        object.__setattr__(
            self,
            "matrix_items",
            sorted(self.matrix_items, key=lambda item: item.menu.lower()),
        )
        object.__setattr__(
            self,
            "heatmaps",
            sorted(self.heatmaps, key=lambda heatmap: heatmap.menu.lower()),
        )
        object.__setattr__(
            self,
            "distribution",
            MatrixDistribution(
                categories=sorted(
                    self.distribution.categories,
                    key=lambda category: category.category.lower(),
                )
            ),
        )
        return self
