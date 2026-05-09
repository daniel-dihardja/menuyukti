"""Build simplified promotion candidate payload for post-scheduler prefetch."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import compute_menu_engineering_promotion_candidates
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact


def build_promotion_engineering_candidates(
    session: Session,
    run: AnalyticsRun,
) -> dict[str, Any] | None:
    """Load order facts and COGS; return only star/puzzle menu names by category."""
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

    raw = compute_menu_engineering_promotion_candidates(order_rows, cogs_by_menu)
    grouping = str(raw.get("grouping") or "flat")

    if grouping == "by_menu_category":
        categories_raw = raw.get("categories")
        out_categories: dict[str, dict[str, list[str]]] = {}
        if isinstance(categories_raw, dict):
            for key, bucket in categories_raw.items():
                if not isinstance(bucket, dict):
                    continue
                star_items = [
                    str(item.get("menu")).strip()
                    for item in (bucket.get("topStars") or [])
                    if isinstance(item, dict) and str(item.get("menu") or "").strip()
                ][:5]
                puzzle_items = [
                    str(item.get("menu")).strip()
                    for item in (bucket.get("topPuzzles") or [])
                    if isinstance(item, dict) and str(item.get("menu") or "").strip()
                ][:10]
                out_categories[str(key)] = {
                    "starItems": star_items,
                    "puzzleItems": puzzle_items,
                }
        return {
            "grouping": "by_menu_category",
            "categories": out_categories,
        }

    star_items = [
        str(item.get("menu")).strip()
        for item in (raw.get("topStars") or [])
        if isinstance(item, dict) and str(item.get("menu") or "").strip()
    ][:5]
    puzzle_items = [
        str(item.get("menu")).strip()
        for item in (raw.get("topPuzzles") or [])
        if isinstance(item, dict) and str(item.get("menu") or "").strip()
    ][:10]
    return {
        "grouping": "flat",
        "starItems": star_items,
        "puzzleItems": puzzle_items,
    }
