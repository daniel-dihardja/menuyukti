"""Menu engineering matrix slices for promotion picks: by POS menu_category or flat."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

import pandas as pd

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    MenuEngineeringMatrixItem,
    MenuEngineeringMatrixResult,
    OrderRowForMatrix,
    compute_menu_engineering_from_orders,
)
from menuyukti.core.analytics.calculate_popularity_index import calculate_popularity_index


class PromotionEngineeringCandidateItem(TypedDict):
    menu: str
    quantity: int
    popularity: float
    price_level: Literal[1, 2, 3]


def _unit_price_from_matrix_item(item: MenuEngineeringMatrixItem) -> float | None:
    quantity = int(item.get("quantity") or 0)
    if quantity <= 0:
        return None
    total_revenue = float(item.get("total_revenue") or 0.0)
    return total_revenue / quantity


def _price_level_for_unit_price(
    unit_price: float,
    *,
    min_price: float,
    max_price: float,
) -> Literal[1, 2, 3]:
    if max_price == min_price:
        return 2
    normalized = (unit_price - min_price) / (max_price - min_price)
    if normalized < 1 / 3:
        return 1
    if normalized < 2 / 3:
        return 2
    return 3


def _price_level_by_menu(matrix: MenuEngineeringMatrixResult) -> dict[str, Literal[1, 2, 3]]:
    unit_prices: dict[str, float] = {}
    for item in matrix["items"]:
        menu = str(item.get("menu") or "").strip()
        if not menu:
            continue
        unit_price = _unit_price_from_matrix_item(item)
        if unit_price is None:
            continue
        unit_prices[menu] = unit_price
    if not unit_prices:
        return {}
    min_price = min(unit_prices.values())
    max_price = max(unit_prices.values())
    return {
        menu: _price_level_for_unit_price(
            unit_price,
            min_price=min_price,
            max_price=max_price,
        )
        for menu, unit_price in unit_prices.items()
    }


def _normalized_menu_category(row: OrderRowForMatrix) -> str | None:
    raw = row.get("menu_category")
    if raw is None:
        return None
    s = str(raw).strip()
    return s if s else None


def _top_quadrant_items(
    matrix: MenuEngineeringMatrixResult,
    quadrant: Literal["star", "puzzle"],
    limit: int | None,
) -> list[MenuEngineeringMatrixItem]:
    items = [it for it in matrix["items"] if str(it.get("category", "")) == quadrant]
    items.sort(
        key=lambda it: (
            -float(it.get("contribution_margin") or 0.0),
            -int(it.get("quantity") or 0),
            str(it.get("menu") or ""),
        ),
    )
    if limit is None:
        return items
    return items[:limit]


def _popularity_by_menu(rows: list[OrderRowForMatrix]) -> dict[str, float]:
    if not rows:
        return {}
    df = pd.DataFrame(rows)
    if df.empty or "menu" not in df.columns or "qty" not in df.columns:
        return {}
    try:
        index_rows = calculate_popularity_index(df)
    except ValueError:
        return {}
    return {str(row["menu"]): float(row["popularity"]) for row in index_rows}


def _enrich_quadrant_items(
    items: list[MenuEngineeringMatrixItem],
    popularity_by_menu: dict[str, float],
    price_level_by_menu: dict[str, Literal[1, 2, 3]],
) -> list[PromotionEngineeringCandidateItem]:
    enriched: list[PromotionEngineeringCandidateItem] = []
    for item in items:
        menu = str(item.get("menu") or "").strip()
        if not menu:
            continue
        quantity = int(item.get("quantity") or 0)
        popularity = popularity_by_menu.get(menu, 0.0)
        price_level = price_level_by_menu.get(menu, 2)
        enriched.append(
            {
                "menu": menu,
                "quantity": quantity,
                "popularity": popularity,
                "price_level": price_level,
            }
        )
    return enriched


def _bucket_payload(
    rows: list[OrderRowForMatrix],
    cogs_by_menu: dict[str, float],
    *,
    max_star_items: int | None,
    max_puzzle_items: int | None,
) -> dict[str, Any]:
    if not rows:
        return {
            "matrix": None,
            "topStars": [],
            "topPuzzles": [],
            "reason": "no rows in bucket",
        }
    try:
        matrix = compute_menu_engineering_from_orders(rows, cogs_by_menu)
    except ValueError as exc:
        return {
            "matrix": None,
            "topStars": [],
            "topPuzzles": [],
            "reason": str(exc) or "matrix unavailable",
        }
    popularity_by_menu = _popularity_by_menu(rows)
    price_level_by_menu = _price_level_by_menu(matrix)
    return {
        "matrix": matrix,
        "topStars": _enrich_quadrant_items(
            _top_quadrant_items(matrix, "star", max_star_items),
            popularity_by_menu,
            price_level_by_menu,
        ),
        "topPuzzles": _enrich_quadrant_items(
            _top_quadrant_items(matrix, "puzzle", max_puzzle_items),
            popularity_by_menu,
            price_level_by_menu,
        ),
    }


def compute_menu_engineering_promotion_candidates(
    order_rows: list[OrderRowForMatrix],
    cogs_by_menu: dict[str, float],
    *,
    max_star_items: int | None = 5,
    max_puzzle_items: int | None = 10,
) -> dict[str, Any]:
    """
    Run menu engineering per distinct ``menu_category`` when any row has a non-empty
    category; otherwise one matrix on all rows (flat).

    Grouped mode only includes rows with non-empty trimmed ``menu_category``;
    rows without category are counted in ``rowsSkippedMissingCategory`` and
    omitted from per-category slices.

    Args:
        order_rows: Line-level rows (see :class:`OrderRowForMatrix`).
        cogs_by_menu: Menu name -> unit COGS.
        max_star_items: Max star-quadrant items per bucket.
        max_puzzle_items: Max puzzle-quadrant items per bucket.

    Returns:
        JSON-friendly dict: either ``grouping="flat"`` with ``matrix``, ``topStars``,
        ``topPuzzles``, or ``grouping="by_menu_category"`` with ``categories`` map
        keyed by exact ``menu_category`` strings from the data.
    """
    if not order_rows:
        msg = "order_rows must not be empty"
        raise ValueError(msg)

    skipped = 0
    by_category: dict[str, list[OrderRowForMatrix]] = {}
    for row in order_rows:
        key = _normalized_menu_category(row)
        if key is None:
            skipped += 1
            continue
        by_category.setdefault(key, []).append(row)

    if not by_category:
        flat = _bucket_payload(
            order_rows,
            cogs_by_menu,
            max_star_items=max_star_items,
            max_puzzle_items=max_puzzle_items,
        )
        return {
            "grouping": "flat",
            "rowsSkippedMissingCategory": skipped,
            **flat,
        }

    categories_out: dict[str, Any] = {}
    for cat in sorted(by_category.keys()):
        categories_out[cat] = _bucket_payload(
            by_category[cat],
            cogs_by_menu,
            max_star_items=max_star_items,
            max_puzzle_items=max_puzzle_items,
        )

    return {
        "grouping": "by_menu_category",
        "rowsSkippedMissingCategory": skipped,
        "categories": categories_out,
    }
