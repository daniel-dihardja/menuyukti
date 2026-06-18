"""Aggregate distinct menu lines from order facts for a single analytics run."""

from __future__ import annotations

import hashlib
from typing import Any

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_facts import load_order_facts


def build_menu_catalog(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
) -> list[dict[str, Any]]:
    """
    Return one row per distinct menu name in the run: category, quantity-weighted avg unit price.

    ``id`` is a stable hash of menu name for LLM-friendly references (no separate menu PK in DB).
    """
    rows = load_order_facts(session, run.id, info=info)
    if not rows:
        return []

    by_menu: dict[str, dict[str, Any]] = {}
    for r in rows:
        menu = str(r.menu).strip()
        if not menu:
            continue
        line_rev = float(r.price) * int(r.qty)
        if menu not in by_menu:
            by_menu[menu] = {
                "menu": menu,
                "quantity": 0,
                "line_revenue": 0.0,
                "menu_category": str(r.menu_category or ""),
                "menu_category_detail": str(r.menu_category_detail or ""),
            }
        by_menu[menu]["quantity"] += int(r.qty)
        by_menu[menu]["line_revenue"] += line_rev

    out: list[dict[str, Any]] = []
    for _menu, agg in sorted(by_menu.items(), key=lambda x: x[0].lower()):
        qty = int(agg["quantity"])
        avg_unit = float(agg["line_revenue"]) / qty if qty else 0.0
        stable = hashlib.sha256(agg["menu"].encode("utf-8")).hexdigest()[:16]
        out.append(
            {
                "id": stable,
                "name": agg["menu"],
                "category": agg["menu_category"],
                "category_detail": agg["menu_category_detail"],
                "price": round(avg_unit, 4),
                "quantity": qty,
                "description": None,
                "is_active": True,
            }
        )
    return out
