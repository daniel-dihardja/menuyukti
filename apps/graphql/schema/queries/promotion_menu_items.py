"""GraphQL types and resolver for promotionMenuItems (v1)."""

from datetime import date

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.promotion_menu_items import build_promotion_menu_items


@strawberry.type(
    description=(
        "Per-menu signals for choosing promotion content: sales totals, optional "
        "menu-engineering classification when COGS exist, and optional peak demand timing."
    )
)
class PromotionMenuItemType:
    menu: str
    quantity: int
    totalRevenue: float
    menuCategory: str | None
    menuCategoryDetail: str | None
    cogs: float | None
    totalCogs: float | None
    contributionMargin: float | None
    contributionMarginPercentage: float | None
    marginPerUnit: float | None
    weValue: float | None
    category: str | None
    action: str | None
    peakHour: int | None
    peakDay: str | None


@strawberry.type(
    description=(
        "Analytics-run scoped list of menu items with data to support promotion picks. "
        "Engineering fields are null when the menu engineering matrix cannot be computed "
        "(e.g. missing COGS) or when an item is excluded from the matrix (no unit COGS)."
    )
)
class PromotionMenuItemsPayloadType:
    analyticsRunId: strawberry.ID
    periodStart: date | None
    periodEnd: date | None
    items: list[PromotionMenuItemType]
    items_total_count: int = strawberry.field(
        description="Menus evaluated before applying the promotion list cap (same as pre-cap row count).",
    )
    items_truncated: bool = strawberry.field(
        description="True when more menus existed than returned in items (see cap in API docs).",
    )


def _row_to_promotion_item(row: dict) -> PromotionMenuItemType:
    return PromotionMenuItemType(
        menu=row["menu"],
        quantity=int(row["quantity"]),
        totalRevenue=float(row["total_revenue"]),
        menuCategory=row.get("menu_category"),
        menuCategoryDetail=row.get("menu_category_detail"),
        cogs=row.get("cogs"),
        totalCogs=row.get("total_cogs"),
        contributionMargin=row.get("contribution_margin"),
        contributionMarginPercentage=row.get("contribution_margin_percentage"),
        marginPerUnit=row.get("margin_per_unit"),
        weValue=row.get("we_value"),
        category=row.get("category"),
        action=row.get("action"),
        peakHour=row.get("peak_hour"),
        peakDay=row.get("peak_day"),
    )


@strawberry.type
class PromotionMenuItemsQuery:
    @strawberry.field(
        description=(
            "Return per-menu promotion signals for an analytics run: volume and revenue, "
            "optional BCG-style menu-engineering metrics when COGS allow, and peak hour/day "
            "from demand heatmaps. "
            "When locationId is set, the run must belong to that location (otherwise returns null)."
        )
    )
    def promotion_menu_items(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> PromotionMenuItemsPayloadType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            built = build_promotion_menu_items(session, run)
            items = [_row_to_promotion_item(r) for r in built.rows]

            return PromotionMenuItemsPayloadType(
                analyticsRunId=strawberry.ID(str(run.id)),
                periodStart=run.period_start,
                periodEnd=run.period_end,
                items=items,
                items_total_count=built.items_total_count,
                items_truncated=built.items_truncated,
            )
