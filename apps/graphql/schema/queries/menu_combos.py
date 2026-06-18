"""GraphQL types and resolver for menuCombos."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.menu_combos import build_menu_combos


@strawberry.type(
    description="Co-occurrence metrics for a pair of menu items within the same order."
)
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


def menu_combos_to_gql(raw: dict) -> MenuCombosPayloadType:
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
            matrix_category_a=p.get("matrix_category_a"),
            matrix_category_b=p.get("matrix_category_b"),
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
        with request_session_scope(info) as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id, info=info)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None
            raw = build_menu_combos(session, run, info=info)
            if raw is None:
                return None
            return menu_combos_to_gql(raw)
