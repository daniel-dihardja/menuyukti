"""Build promotion engineering candidate payload (matrix by menu_category or flat)."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import compute_menu_engineering_promotion_candidates
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact


def build_promotion_engineering_candidates(
    session: Session,
    run: AnalyticsRun,
) -> dict[str, Any] | None:
    """Load order facts and COGS, return grouping + matrix slices for agents."""
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

    return compute_menu_engineering_promotion_candidates(order_rows, cogs_by_menu)
