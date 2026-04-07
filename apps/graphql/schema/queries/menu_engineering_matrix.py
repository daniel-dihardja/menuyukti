"""GraphQL types and resolver for menuEngineeringMatrix."""

import strawberry
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact, SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info


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


def _compute_menu_engineering_matrix_for_run(
    session, run: AnalyticsRun
) -> MenuEngineeringMatrixType | None:
    rows = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()

    if not rows:
        return None

    order_rows = [
        {
            "menu": r.menu,
            "qty": r.qty,
            "total_after_bill_discount": r.total_after_bill_discount,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in rows
    ]

    cogs_rows = session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run.id).all()
    cogs_by_menu = {r.menu: float(r.cogs) for r in cogs_rows}

    try:
        result = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)
    except ValueError:
        return None

    thresholds = result["thresholds"]
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
        for d in result["distribution"]
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
        for item in result["items"]
    ]

    return MenuEngineeringMatrixType(
        thresholds=thresholds_type,
        distribution=distribution_type,
        items=items_type,
    )


@strawberry.type
class MenuEngineeringMatrixQuery:
    @strawberry.field(
        description=(
            "Compute the menu engineering BCG matrix for an analytics run. "
            "Requires COGS to be set; returns None if no COGS are available. "
            "Optionally filter returned items to specific categories "
            "(star, puzzle, plow_horse, low_end) — thresholds and distribution "
            "always reflect the full dataset. "
            "When locationId is set, the run must belong to that location (otherwise returns null)."
        )
    )
    def menu_engineering_matrix(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        categories: list[str] | None = None,
        location_id: strawberry.ID | None = None,
    ) -> MenuEngineeringMatrixType | None:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None
            matrix = _compute_menu_engineering_matrix_for_run(session, run)
            if matrix is None or not categories:
                return matrix
            category_set = set(categories)
            filtered_items = [i for i in matrix.items if i.category in category_set]
            return MenuEngineeringMatrixType(
                thresholds=matrix.thresholds,
                distribution=matrix.distribution,
                items=filtered_items,
            )
        finally:
            session.close()
