"""Build promotion-oriented per-menu rows from a single OrderFact load.

OrderFact rows are loaded only inside this module for analytics; the public API returns
aggregated per-menu dicts capped at ``_MAX_PROMOTION_MENU_ITEMS`` (sorted by revenue, then quantity).
"""

from __future__ import annotations

from typing import Any, NamedTuple

import pandas as pd
from menuyukti.core.analytics import compute_menu_heatmaps_from_orders
from menuyukti.core.analytics.calculate_menu_heatmaps import WEEKDAY_ORDER
from menuyukti.core.analytics.extract_menu_items import extract_menu_items
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.services.menu_engineering import compute_menu_engineering_matrix

# Cap returned rows so agents and clients never receive unbounded promotion payloads.
# OrderFact rows stay inside this service; only aggregated rows cross the API boundary.
_MAX_PROMOTION_MENU_ITEMS = 50


class PromotionMenuItemsBuildResult(NamedTuple):
    """Aggregated promotion rows plus counts for API transparency."""

    rows: list[dict[str, Any]]
    items_total_count: int
    items_truncated: bool


def _peak_hour_from_daily(daily: list[dict[str, Any]]) -> int | None:
    if not daily:
        return None
    max_q = max(int(r["quantity"]) for r in daily)
    hours = [int(r["hour"]) for r in daily if int(r["quantity"]) == max_q]
    return min(hours) if hours else None


def _peak_day_from_weekly(weekly: list[dict[str, Any]]) -> str | None:
    if not weekly:
        return None
    max_q = max(int(r["quantity"]) for r in weekly)
    days = [str(r["day"]) for r in weekly if int(r["quantity"]) == max_q]
    if not days:
        return None
    order = {d: i for i, d in enumerate(WEEKDAY_ORDER)}
    return min(days, key=lambda d: order.get(d, 999))


def _heatmap_peaks_by_menu(
    heatmap_payloads: list[dict[str, Any]],
) -> dict[str, tuple[int | None, str | None]]:
    out: dict[str, tuple[int | None, str | None]] = {}
    for payload in heatmap_payloads:
        menu = str(payload["menu"])
        daily = list(payload["daily_heatmap"])
        weekly = list(payload["weekly_heatmap"])
        out[menu] = (
            _peak_hour_from_daily(daily),
            _peak_day_from_weekly(weekly),
        )
    return out


def build_promotion_menu_items(session: Session, run: AnalyticsRun) -> PromotionMenuItemsBuildResult:
    """
    One ``OrderFact`` query per call; matrix reuses those rows via ``order_facts``.

    Raw facts are used only inside analytics helpers here; the return value is capped
    aggregated rows (never raw line-level facts).

    Returns JSON-friendly dicts with snake_case keys aligned with menuyukti outputs,
    plus ``peak_hour`` and ``peak_day`` (string weekday code, e.g. ``mon``).
    """
    facts = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()
    if not facts:
        return PromotionMenuItemsBuildResult(rows=[], items_total_count=0, items_truncated=False)

    df = pd.DataFrame(
        [
            {
                "menu": r.menu,
                "qty": r.qty,
                "price": r.price,
                "menu_category": r.menu_category,
                "menu_category_detail": r.menu_category_detail,
            }
            for r in facts
        ]
    )
    extracted = extract_menu_items(df)

    matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts)
    matrix_by_menu: dict[str, dict[str, Any]] = {}
    if matrix_data is not None:
        matrix_by_menu = {str(item["menu"]): item for item in matrix_data.items}

    heatmap_rows = [
        {
            "menu": r.menu,
            "qty": r.qty,
            "order_time": r.order_time,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in facts
    ]
    heatmap_payloads = compute_menu_heatmaps_from_orders(heatmap_rows)
    peaks = _heatmap_peaks_by_menu(heatmap_payloads)

    rows: list[dict[str, Any]] = []
    for row in extracted:
        menu = str(row["menu"])
        mrow = matrix_by_menu.get(menu)
        peak_hour, peak_day = peaks.get(menu, (None, None))

        base: dict[str, Any] = {
            "menu": menu,
            "quantity": int(row["quantity"]),
            "total_revenue": float(row["total_revenue"]),
            "menu_category": row.get("menu_category"),
            "menu_category_detail": row.get("menu_category_detail"),
            "peak_hour": peak_hour,
            "peak_day": peak_day,
        }

        if mrow is None:
            base.update(
                {
                    "cogs": None,
                    "total_cogs": None,
                    "contribution_margin": None,
                    "contribution_margin_percentage": None,
                    "margin_per_unit": None,
                    "we_value": None,
                    "category": None,
                    "action": None,
                }
            )
        else:
            base.update(
                {
                    "cogs": float(mrow["cogs"]),
                    "total_cogs": float(mrow["total_cogs"]),
                    "contribution_margin": float(mrow["contribution_margin"]),
                    "contribution_margin_percentage": float(mrow["contribution_margin_percentage"]),
                    "margin_per_unit": float(mrow["margin_per_unit"]),
                    "we_value": float(mrow["we_value"]),
                    "category": str(mrow["category"]),
                    "action": str(mrow["action"]),
                }
            )

        rows.append(base)

    rows.sort(
        key=lambda r: (-float(r["total_revenue"]), -int(r["quantity"]), str(r["menu"])),
    )
    total = len(rows)
    truncated = total > _MAX_PROMOTION_MENU_ITEMS
    if truncated:
        rows = rows[:_MAX_PROMOTION_MENU_ITEMS]

    return PromotionMenuItemsBuildResult(
        rows=rows,
        items_total_count=total,
        items_truncated=truncated,
    )
