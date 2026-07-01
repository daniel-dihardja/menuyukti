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


@strawberry.type(description="Co-order intensity for one day and meal-period slot.")
class ComboPairTimingCellType:
    day: str
    meal_period: str
    meal_period_label: str
    meal_period_hours_label: str
    co_order_count: int
    co_order_index: float
    attach_rate: float


@strawberry.type(description="Hourly co-order count for a combo pair.")
class ComboPairTimingHourType:
    hour: int
    co_order_count: int


@strawberry.type(description="Recommended promo window for a combo pair.")
class ComboPairRecommendedWindowType:
    best_day: str | None
    best_meal_period: str | None
    best_meal_period_label: str | None
    best_meal_period_hours_label: str | None
    peak_hour: int | None
    co_order_index: float | None
    sample_co_orders: int
    confidence_tier: str


@strawberry.type(description="Venue demand for one day and meal-period slot.")
class SlotDemandCellType:
    day: str
    meal_period: str
    meal_period_label: str
    meal_period_hours_label: str
    order_count: int
    traffic_share: float
    demand_index: float
    relative_demand: str


@strawberry.type(description="Promo posture for a combo pair's peak window.")
class ComboPromoPostureType:
    promo_posture: str
    peak_day: str | None
    peak_meal_period: str | None
    pair_co_order_index: float | None
    venue_demand_index: float | None
    venue_relative_demand: str | None
    promo_reason: str


@strawberry.type(description="Timing analytics for when a combo pair is ordered together.")
class MenuComboPairTimingType:
    menu_a: str
    menu_b: str
    recommended_window: ComboPairRecommendedWindowType
    promo_posture: ComboPromoPostureType
    day_meal_cells: list[ComboPairTimingCellType]
    hourly_co_orders: list[ComboPairTimingHourType]


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
    slot_demand_profile: list[SlotDemandCellType]
    top_pair_timing: list[MenuComboPairTimingType]


def slot_demand_cells_to_gql(cells: list[dict]) -> list[SlotDemandCellType]:
    return [
        SlotDemandCellType(
            day=c["day"],
            meal_period=c["meal_period"],
            meal_period_label=c["meal_period_label"],
            meal_period_hours_label=c["meal_period_hours_label"],
            order_count=c["order_count"],
            traffic_share=c["traffic_share"],
            demand_index=c["demand_index"],
            relative_demand=c["relative_demand"],
        )
        for c in cells
    ]


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

    top_pair_timing = [
        MenuComboPairTimingType(
            menu_a=t["menu_a"],
            menu_b=t["menu_b"],
            recommended_window=ComboPairRecommendedWindowType(
                best_day=t["recommended_window"]["best_day"],
                best_meal_period=t["recommended_window"]["best_meal_period"],
                best_meal_period_label=t["recommended_window"]["best_meal_period_label"],
                best_meal_period_hours_label=t["recommended_window"].get(
                    "best_meal_period_hours_label"
                ),
                peak_hour=t["recommended_window"]["peak_hour"],
                co_order_index=t["recommended_window"]["co_order_index"],
                sample_co_orders=t["recommended_window"]["sample_co_orders"],
                confidence_tier=t["recommended_window"]["confidence_tier"],
            ),
            promo_posture=ComboPromoPostureType(
                promo_posture=t["promo_posture"]["promo_posture"],
                peak_day=t["promo_posture"]["peak_day"],
                peak_meal_period=t["promo_posture"]["peak_meal_period"],
                pair_co_order_index=t["promo_posture"]["pair_co_order_index"],
                venue_demand_index=t["promo_posture"]["venue_demand_index"],
                venue_relative_demand=t["promo_posture"]["venue_relative_demand"],
                promo_reason=t["promo_posture"]["promo_reason"],
            ),
            day_meal_cells=[
                ComboPairTimingCellType(
                    day=c["day"],
                    meal_period=c["meal_period"],
                    meal_period_label=c["meal_period_label"],
                    meal_period_hours_label=c["meal_period_hours_label"],
                    co_order_count=c["co_order_count"],
                    co_order_index=c["co_order_index"],
                    attach_rate=c["attach_rate"],
                )
                for c in t["day_meal_cells"]
            ],
            hourly_co_orders=[
                ComboPairTimingHourType(
                    hour=h["hour"],
                    co_order_count=h["co_order_count"],
                )
                for h in t["hourly_co_orders"]
            ],
        )
        for t in raw.get("top_pair_timing", [])
    ]

    slot_demand_profile = slot_demand_cells_to_gql(raw.get("slot_demand_profile", []))

    return MenuCombosPayloadType(
        total_orders=raw["total_orders"],
        multi_item_order_count=raw["multi_item_order_count"],
        avg_distinct_items_per_order=raw["avg_distinct_items_per_order"],
        scope=raw["scope"],
        focus_menus=list(raw["focus_menus"]),
        pairs=pairs,
        matrix_lift=raw["matrix_lift"],
        slot_demand_profile=slot_demand_profile,
        top_pair_timing=top_pair_timing,
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
