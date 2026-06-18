"""Menu engineering matrix GraphQL types."""

import strawberry


@strawberry.type(
    description=(
        "Portfolio-level thresholds used to classify menu items in the engineering matrix. "
        "avgPopularity and avgContributionMargin are the BCG quadrant cut-off values."
    )
)
class MenuEngineeringThresholdsType:
    avgPopularity: float
    avgContributionMargin: float
    totalCogs: float
    totalProfit: float
    totalMargin: float


@strawberry.type(
    description="Share of items and margin contribution per BCG category (star, puzzle, plow_horse, low_end)."
)
class MenuEngineeringDistributionItemType:
    category: str
    itemCount: int
    itemShare: float
    marginShare: float


@strawberry.type(
    description=(
        "A single menu item's position in the menu engineering BCG matrix, including its "
        "classification (star, puzzle, plow_horse, low_end) and recommended action."
    )
)
class MenuEngineeringMatrixItemType:
    menu: str
    quantity: int
    totalRevenue: float
    cogs: float
    totalCogs: float
    contributionMargin: float
    contributionMarginPercentage: float
    marginPerUnit: float
    weValue: float
    category: str
    action: str
    menuCategory: str | None
    menuCategoryDetail: str | None


@strawberry.type(
    description=(
        "Full menu engineering BCG matrix for an analytics run. "
        "Contains portfolio thresholds, per-category distribution, and per-item classification."
    )
)
class MenuEngineeringMatrixType:
    thresholds: MenuEngineeringThresholdsType
    distribution: list[MenuEngineeringDistributionItemType]
    items: list[MenuEngineeringMatrixItemType]
