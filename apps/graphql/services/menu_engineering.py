"""Menu engineering matrix computation (DB + domain math)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import strawberry
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact
from graphql.services.order_facts import load_order_facts


@dataclass
class MenuEngineeringMatrixData:
    """Structured result before mapping to Strawberry types."""

    thresholds: dict[str, float]
    distribution: list[dict[str, Any]]
    items: list[dict[str, Any]]


def compute_menu_engineering_matrix(
    session: Session,
    run: AnalyticsRun,
    *,
    order_facts: Sequence[OrderFact] | None = None,
    info: strawberry.Info | None = None,
) -> MenuEngineeringMatrixData | None:
    """Load facts and COGS, run matrix math; return None if no rows or on ValueError.

    When ``order_facts`` is provided, use those rows instead of querying ``OrderFact``
    again (same shape as a DB load for this run).
    """
    rows = (
        list(order_facts)
        if order_facts is not None
        else load_order_facts(session, run.id, info=info)
    )

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

    try:
        result = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)
    except ValueError:
        return None

    return MenuEngineeringMatrixData(
        thresholds=result["thresholds"],
        distribution=list(result["distribution"]),
        items=list(result["items"]),
    )
