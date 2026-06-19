"""Menu basket affinity payloads for GraphQL."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import (
    compute_combo_pair_timing_from_orders,
    compute_menu_basket_affinities_from_orders,
    compute_slot_demand_profile_from_orders,
    derive_combo_promo_posture,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.menu_engineering import compute_menu_engineering_matrix
from graphql.services.order_fact_rows import facts_to_basket_rows, facts_to_combo_timing_rows
from graphql.services.order_facts import load_order_facts

TOP_PAIR_TIMING_COUNT = 3


def _star_focus_menus(matrix_items: list[dict[str, Any]]) -> list[str] | None:
    stars = [
        str(item["menu"]) for item in matrix_items if str(item.get("category") or "") == "star"
    ]
    if len(stars) >= 2:
        return stars
    return None


def _top_pairs_for_timing(pairs: list[dict[str, Any]], *, limit: int = TOP_PAIR_TIMING_COUNT) -> list[dict[str, str]]:
    sorted_pairs = sorted(
        pairs,
        key=lambda p: (-float(p["lift"]), -int(p["co_order_count"]), p["menu_a"], p["menu_b"]),
    )
    return [
        {"menu_a": p["menu_a"], "menu_b": p["menu_b"]}
        for p in sorted_pairs[:limit]
    ]


def build_menu_combos(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
    order_facts: list | None = None,
) -> dict[str, Any] | None:
    """Return basket affinity payload with matrix category enrichment, or None if no data."""
    facts = order_facts if order_facts is not None else load_order_facts(session, run.id, info=info)
    if not facts:
        return None

    matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts, info=info)
    matrix_by_menu: dict[str, str | None] = {}
    focus_menus: list[str] | None = None
    if matrix_data is not None:
        matrix_by_menu = {
            str(item["menu"]): str(item["category"]) if item.get("category") else None
            for item in matrix_data.items
        }
        focus_menus = _star_focus_menus(matrix_data.items)

    raw = compute_menu_basket_affinities_from_orders(
        facts_to_basket_rows(facts), focus_menus=focus_menus
    )

    pairs = [
        {
            **p,
            "matrix_category_a": matrix_by_menu.get(p["menu_a"]),
            "matrix_category_b": matrix_by_menu.get(p["menu_b"]),
        }
        for p in raw["pairs"]
    ]

    top_pair_inputs = _top_pairs_for_timing(pairs)
    combo_timing_rows = facts_to_combo_timing_rows(facts)
    slot_demand_profile = compute_slot_demand_profile_from_orders(combo_timing_rows)
    top_pair_timing_raw = compute_combo_pair_timing_from_orders(
        combo_timing_rows,
        top_pair_inputs,
    )
    top_pair_timing = [
        {**timing, "promo_posture": derive_combo_promo_posture(timing, slot_demand_profile)}
        for timing in top_pair_timing_raw
    ]

    return {
        "total_orders": raw["total_orders"],
        "multi_item_order_count": raw["multi_item_order_count"],
        "avg_distinct_items_per_order": raw["avg_distinct_items_per_order"],
        "scope": raw["scope"],
        "focus_menus": list(raw["focus_menus"]),
        "pairs": pairs,
        "matrix_lift": raw["matrix_lift"],
        "slot_demand_profile": slot_demand_profile,
        "top_pair_timing": top_pair_timing,
    }
