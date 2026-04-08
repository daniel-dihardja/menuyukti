"""Menu engineering matrix computation (DB + domain math)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact


@dataclass
class MenuEngineeringMatrixData:
    """Structured result before mapping to Strawberry types."""

    thresholds: dict[str, float]
    distribution: list[dict[str, Any]]
    items: list[dict[str, Any]]


def compute_menu_engineering_matrix(
    session: Session, run: AnalyticsRun
) -> MenuEngineeringMatrixData | None:
    """Load facts and COGS, run matrix math; return None if no rows or on ValueError."""
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

    try:
        result = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)
    except ValueError:
        return None

    return MenuEngineeringMatrixData(
        thresholds=result["thresholds"],
        distribution=list(result["distribution"]),
        items=list(result["items"]),
    )
