"""Map menu engineering matrix service data to Strawberry types."""

from __future__ import annotations

from graphql.schema.types.menu_engineering_matrix import (
    MenuEngineeringDistributionItemType,
    MenuEngineeringMatrixItemType,
    MenuEngineeringMatrixType,
    MenuEngineeringThresholdsType,
)
from graphql.services.menu_engineering import MenuEngineeringMatrixData


def matrix_data_to_gql(data: MenuEngineeringMatrixData) -> MenuEngineeringMatrixType:
    thresholds = data.thresholds
    thresholds_type = MenuEngineeringThresholdsType(
        avgPopularity=thresholds["avg_popularity"],
        avgContributionMargin=thresholds["avg_contribution_margin"],
        totalCogs=thresholds["total_cogs"],
        totalProfit=thresholds["total_profit"],
        totalMargin=thresholds["total_margin"],
    )

    distribution_type = [
        MenuEngineeringDistributionItemType(
            category=d["category"],
            itemCount=d["item_count"],
            itemShare=d["item_share"],
            marginShare=d["margin_share"],
        )
        for d in data.distribution
    ]

    items_type = [
        MenuEngineeringMatrixItemType(
            menu=item["menu"],
            quantity=item["quantity"],
            totalRevenue=item["total_revenue"],
            cogs=item["cogs"],
            totalCogs=item["total_cogs"],
            contributionMargin=item["contribution_margin"],
            contributionMarginPercentage=item["contribution_margin_percentage"],
            marginPerUnit=item["margin_per_unit"],
            weValue=item["we_value"],
            category=item["category"],
            action=item["action"],
            menuCategory=item.get("menu_category"),
            menuCategoryDetail=item.get("menu_category_detail"),
        )
        for item in data.items
    ]

    return MenuEngineeringMatrixType(
        thresholds=thresholds_type,
        distribution=distribution_type,
        items=items_type,
    )
