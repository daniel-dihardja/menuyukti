"""Build simplified promotion candidate payload for post-scheduler prefetch."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import compute_menu_engineering_promotion_candidates
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact

_DEFAULT_MAX_STAR_ITEMS = 5
_DEFAULT_MAX_PUZZLE_ITEMS = 10


def _resolve_limit(value: int | None, default: int) -> int | None:
    """Return None for unlimited (0 or negative), else clamp to positive int or default."""
    if value is None:
        return default
    if value <= 0:
        return None
    return value


def _passthrough_engineering_item(item: Any) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    menu = str(item.get("menu") or "").strip()
    if not menu:
        return None
    quantity_raw = item.get("quantity")
    popularity_raw = item.get("popularity")
    quantity = int(quantity_raw) if quantity_raw is not None else 0
    popularity = float(popularity_raw) if popularity_raw is not None else 0.0
    return {
        "menu": menu,
        "quantity": quantity,
        "popularity": popularity,
    }


def _passthrough_engineering_items(raw_items: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_items, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw_items:
        parsed = _passthrough_engineering_item(item)
        if parsed is not None:
            out.append(parsed)
    return out


def build_promotion_engineering_candidates(
    session: Session,
    run: AnalyticsRun,
    *,
    max_star_items: int | None = None,
    max_puzzle_items: int | None = None,
) -> dict[str, Any] | None:
    """Load order facts and COGS; return star/puzzle items with menu metrics by category."""
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

    star_limit = _resolve_limit(max_star_items, _DEFAULT_MAX_STAR_ITEMS)
    puzzle_limit = _resolve_limit(max_puzzle_items, _DEFAULT_MAX_PUZZLE_ITEMS)

    raw = compute_menu_engineering_promotion_candidates(
        order_rows,
        cogs_by_menu,
        max_star_items=star_limit,
        max_puzzle_items=puzzle_limit,
    )
    grouping = str(raw.get("grouping") or "flat")

    if grouping == "by_menu_category":
        categories_raw = raw.get("categories")
        out_categories: dict[str, dict[str, list[dict[str, Any]]]] = {}
        if isinstance(categories_raw, dict):
            for key, bucket in categories_raw.items():
                if not isinstance(bucket, dict):
                    continue
                out_categories[str(key)] = {
                    "starItems": _passthrough_engineering_items(bucket.get("topStars")),
                    "puzzleItems": _passthrough_engineering_items(bucket.get("topPuzzles")),
                }
        return {
            "grouping": "by_menu_category",
            "categories": out_categories,
        }

    return {
        "grouping": "flat",
        "starItems": _passthrough_engineering_items(raw.get("topStars")),
        "puzzleItems": _passthrough_engineering_items(raw.get("topPuzzles")),
    }
