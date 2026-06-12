"""Market-basket affinity: co-occurrence, support, confidence, and lift per menu pair."""

from __future__ import annotations

from collections import defaultdict
from itertools import combinations
from typing import Literal, NotRequired, TypedDict

import pandas as pd

from menuyukti.core.analytics.frame_contracts import (
    ensure_optional_category_columns,
    menu_basket_affinities_columns,
    require_columns,
)

MAX_FOCUS_ITEMS = 12
MAX_TOP_PAIRS = 25
MIN_CO_OCCURRENCE = 3

BasketScope = Literal["stars", "top_by_presence"]


class OrderRowForBasket(TypedDict):
    """One order line for basket affinity."""

    bill_number: str
    menu: str
    menu_category: NotRequired[str | None]
    menu_category_detail: NotRequired[str | None]


class MenuBasketPair(TypedDict):
    menu_a: str
    menu_b: str
    co_order_count: int
    support: float
    confidence_a_to_b: float
    confidence_b_to_a: float
    lift: float
    menu_a_category: str | None
    menu_b_category: str | None


class MenuBasketAffinitiesResult(TypedDict):
    total_orders: int
    multi_item_order_count: int
    avg_distinct_items_per_order: float
    scope: BasketScope
    focus_menus: list[str]
    pairs: list[MenuBasketPair]
    matrix_lift: list[list[float | None]]


def _empty_result(scope: BasketScope = "top_by_presence") -> MenuBasketAffinitiesResult:
    return {
        "total_orders": 0,
        "multi_item_order_count": 0,
        "avg_distinct_items_per_order": 0.0,
        "scope": scope,
        "focus_menus": [],
        "pairs": [],
        "matrix_lift": [],
    }


def _menu_category_by_menu(df: pd.DataFrame) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for menu, group in df.groupby("menu", sort=False):
        values = group["menu_category"].dropna().astype(str).str.strip()
        unique = [v for v in values.unique() if v]
        out[str(menu)] = unique[0] if unique else None
    return out


def _orders_with_menus(df: pd.DataFrame) -> list[frozenset[str]]:
    grouped = df.groupby("bill_number", sort=False)["menu"].apply(
        lambda menus: frozenset(str(m).strip() for m in menus if str(m).strip())
    )
    return [menus for menus in grouped if menus]


def _resolve_focus_menus(
    orders: list[frozenset[str]],
    focus_menus: list[str] | None,
) -> tuple[list[str], BasketScope]:
    if focus_menus:
        cleaned = [m.strip() for m in focus_menus if m and str(m).strip()]
        seen: set[str] = set()
        unique: list[str] = []
        for menu in cleaned:
            if menu not in seen:
                seen.add(menu)
                unique.append(menu)
        if len(unique) >= 2:
            return unique[:MAX_FOCUS_ITEMS], "stars"

    presence: dict[str, int] = defaultdict(int)
    for order_menus in orders:
        for menu in order_menus:
            presence[menu] += 1
    ranked = sorted(presence.keys(), key=lambda m: (-presence[m], m))
    return ranked[:MAX_FOCUS_ITEMS], "top_by_presence"


def calculate_menu_basket_affinities(
    df: pd.DataFrame,
    *,
    focus_menus: list[str] | None = None,
) -> MenuBasketAffinitiesResult:
    """
    Compute basket affinity metrics from line-level order rows.

    Uses distinct menu presence per bill (qty does not affect pairing).
    """
    if df.empty:
        return _empty_result()

    require_columns(
        df,
        menu_basket_affinities_columns(),
        context="calculate_menu_basket_affinities",
    )
    work = ensure_optional_category_columns(df.copy())
    work["bill_number"] = work["bill_number"].astype(str).str.strip()
    work["menu"] = work["menu"].astype(str).str.strip()
    work = work[(work["bill_number"] != "") & (work["menu"] != "")]
    if work.empty:
        return _empty_result()

    orders = _orders_with_menus(work)
    total_orders = len(orders)
    if total_orders == 0:
        return _empty_result()

    distinct_counts = [len(o) for o in orders]
    avg_distinct = sum(distinct_counts) / total_orders
    multi_item_orders = [o for o in orders if len(o) >= 2]
    multi_item_order_count = len(multi_item_orders)

    focus, scope = _resolve_focus_menus(orders, focus_menus)
    if len(focus) < 2:
        return {
            "total_orders": total_orders,
            "multi_item_order_count": multi_item_order_count,
            "avg_distinct_items_per_order": round(avg_distinct, 4),
            "scope": scope,
            "focus_menus": focus,
            "pairs": [],
            "matrix_lift": [],
        }

    focus_set = set(focus)
    menu_category = _menu_category_by_menu(work)

    orders_with_menu: dict[str, int] = defaultdict(int)
    pair_counts: dict[tuple[str, str], int] = defaultdict(int)

    for order_menus in orders:
        in_focus = sorted(m for m in order_menus if m in focus_set)
        for menu in in_focus:
            orders_with_menu[menu] += 1
        if len(in_focus) < 2:
            continue
        for a, b in combinations(in_focus, 2):
            pair_counts[(a, b)] += 1

    if multi_item_order_count == 0:
        matrix_lift = _build_matrix_lift(focus, {})
        return {
            "total_orders": total_orders,
            "multi_item_order_count": 0,
            "avg_distinct_items_per_order": round(avg_distinct, 4),
            "scope": scope,
            "focus_menus": focus,
            "pairs": [],
            "matrix_lift": matrix_lift,
        }

    pairs: list[MenuBasketPair] = []
    lift_by_pair: dict[tuple[str, str], float] = {}
    for (menu_a, menu_b), co_count in pair_counts.items():
        if co_count < MIN_CO_OCCURRENCE:
            continue
        orders_a = orders_with_menu[menu_a]
        orders_b = orders_with_menu[menu_b]
        if orders_a == 0 or orders_b == 0:
            continue
        support = co_count / multi_item_order_count
        p_a = orders_a / total_orders
        p_b = orders_b / total_orders
        denominator = p_a * p_b
        lift = round(support / denominator if denominator > 0 else 0.0, 6)
        lift_by_pair[(menu_a, menu_b)] = lift
        pairs.append(
            {
                "menu_a": menu_a,
                "menu_b": menu_b,
                "co_order_count": co_count,
                "support": round(support, 6),
                "confidence_a_to_b": round(co_count / orders_a, 6),
                "confidence_b_to_a": round(co_count / orders_b, 6),
                "lift": lift,
                "menu_a_category": menu_category.get(menu_a),
                "menu_b_category": menu_category.get(menu_b),
            }
        )

    pairs.sort(key=lambda p: (-p["lift"], -p["co_order_count"], p["menu_a"], p["menu_b"]))
    pairs = pairs[:MAX_TOP_PAIRS]
    matrix_lift = _build_matrix_lift(focus, lift_by_pair)

    return {
        "total_orders": total_orders,
        "multi_item_order_count": multi_item_order_count,
        "avg_distinct_items_per_order": round(avg_distinct, 4),
        "scope": scope,
        "focus_menus": focus,
        "pairs": pairs,
        "matrix_lift": matrix_lift,
    }


def _build_matrix_lift(
    focus: list[str],
    lift_by_pair: dict[tuple[str, str], float],
) -> list[list[float | None]]:
    n = len(focus)
    grid: list[list[float | None]] = [[None] * n for _ in range(n)]
    for i, menu_a in enumerate(focus):
        for j, menu_b in enumerate(focus):
            if i == j:
                continue
            if i > j:
                a, b = menu_b, menu_a
            else:
                a, b = menu_a, menu_b
            lift = lift_by_pair.get((a, b))
            if lift is not None:
                grid[i][j] = lift
    return grid


def compute_menu_basket_affinities_from_orders(
    order_rows: list[OrderRowForBasket],
    *,
    focus_menus: list[str] | None = None,
) -> MenuBasketAffinitiesResult:
    """Build a DataFrame from order rows and compute basket affinities."""
    if not order_rows:
        return _empty_result()

    df = pd.DataFrame(order_rows)
    if "menu_category" not in df.columns:
        df["menu_category"] = None
    if "menu_category_detail" not in df.columns:
        df["menu_category_detail"] = None
    return calculate_menu_basket_affinities(df, focus_menus=focus_menus)
