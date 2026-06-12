"""GraphQL types and resolver for menuCombos."""

from __future__ import annotations

import strawberry
from menuyukti.core.analytics import compute_menu_basket_affinities_from_orders

from graphql.data_sources import AnalyticsRun, OrderFact, SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.menu_engineering import compute_menu_engineering_matrix


@strawberry.type(description="Co-occurrence metrics for a pair of menu items within the same order.")
class MenuComboPairType:
    menu_a: str
    menu_b: str
    co_order_count: int
    support: float
    confidence_a_to_b: float
    confidence_b_to_a: float
    lift: float
    menu_a_category: str | None
    menu_b_category: str | None
    matrix_category_a: str | None
    matrix_category_b: str | None


@strawberry.type(
    description=(
        "Basket affinity analytics for an analytics run: which menu items appear "
        "together in orders, ranked by lift."
    )
)
class MenuCombosPayloadType:
    total_orders: int
    multi_item_order_count: int
    avg_distinct_items_per_order: float
    scope: str
    focus_menus: list[str]
    pairs: list[MenuComboPairType]
    matrix_lift: list[list[float | None]]


def _star_focus_menus(matrix_items: list[dict]) -> list[str] | None:
    stars = [str(item["menu"]) for item in matrix_items if str(item.get("category") or "") == "star"]
    if len(stars) >= 2:
        return stars
    return None


def _compute_menu_combos_for_run(session, run: AnalyticsRun) -> MenuCombosPayloadType | None:
    rows = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()
    if not rows:
        return None

    order_rows = [
        {
            "bill_number": r.bill_number,
            "menu": r.menu,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in rows
    ]

    matrix_data = compute_menu_engineering_matrix(session, run, order_facts=rows)
    matrix_by_menu: dict[str, str | None] = {}
    focus_menus: list[str] | None = None
    if matrix_data is not None:
        matrix_by_menu = {
            str(item["menu"]): str(item["category"]) if item.get("category") else None
            for item in matrix_data.items
        }
        focus_menus = _star_focus_menus(matrix_data.items)

    raw = compute_menu_basket_affinities_from_orders(order_rows, focus_menus=focus_menus)

    pairs = [
        MenuComboPairType(
            menu_a=p["menu_a"],
            menu_b=p["menu_b"],
            co_order_count=p["co_order_count"],
            support=p["support"],
            confidence_a_to_b=p["confidence_a_to_b"],
            confidence_b_to_a=p["confidence_b_to_a"],
            lift=p["lift"],
            menu_a_category=p["menu_a_category"],
            menu_b_category=p["menu_b_category"],
            matrix_category_a=matrix_by_menu.get(p["menu_a"]),
            matrix_category_b=matrix_by_menu.get(p["menu_b"]),
        )
        for p in raw["pairs"]
    ]

    return MenuCombosPayloadType(
        total_orders=raw["total_orders"],
        multi_item_order_count=raw["multi_item_order_count"],
        avg_distinct_items_per_order=raw["avg_distinct_items_per_order"],
        scope=raw["scope"],
        focus_menus=list(raw["focus_menus"]),
        pairs=pairs,
        matrix_lift=raw["matrix_lift"],
    )


@strawberry.type
class MenuCombosQuery:
    @strawberry.field(
        description=(
            "Return basket affinity analytics for an analytics run: menu pairs ordered "
            "together, with lift and confidence metrics. Defaults to star items when "
            "menu engineering matrix is available; otherwise top items by order presence. "
            "When locationId is set, the run must belong to that location."
        )
    )
    def menu_combos(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> MenuCombosPayloadType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None
            return _compute_menu_combos_for_run(session, run)
