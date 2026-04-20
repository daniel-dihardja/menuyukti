"""Build promotion candidate signals from promotion items + Instagram signals."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import calculate_promotion_candidates
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.instagram_signals import build_instagram_signals
from graphql.services.promotion_menu_items import build_promotion_menu_items


def build_promotion_candidates_signals(session: Session, run: AnalyticsRun) -> dict[str, Any] | None:
    """Return promotion-candidate signals for one analytics run."""
    promotion = build_promotion_menu_items(session, run)
    if not promotion.rows:
        return None

    instagram = build_instagram_signals(session, run)
    instagram_payload = instagram or {}

    computed = calculate_promotion_candidates(
        promotion_menu_items=[
            {
                "menu": str(row["menu"]),
                "quantity": int(row["quantity"]),
                "total_revenue": float(row["total_revenue"]),
                "menu_category": (
                    row.get("menu_category") if isinstance(row.get("menu_category"), str) else None
                ),
                "menu_category_detail": (
                    row.get("menu_category_detail")
                    if isinstance(row.get("menu_category_detail"), str)
                    else None
                ),
                "category": row.get("category") if isinstance(row.get("category"), str) else None,
                "action": row.get("action") if isinstance(row.get("action"), str) else None,
                "peak_day": row.get("peak_day") if isinstance(row.get("peak_day"), str) else None,
                "peak_hour": row.get("peak_hour") if isinstance(row.get("peak_hour"), int) else None,
                "contribution_margin_percentage": (
                    float(row["contribution_margin_percentage"])
                    if isinstance(row.get("contribution_margin_percentage"), (int, float))
                    else None
                ),
            }
            for row in promotion.rows
        ],
        content_heroes=[
            {"menu": str(row["menu"])}
            for row in (instagram_payload.get("content_heroes") or [])
            if isinstance(row, dict) and isinstance(row.get("menu"), str)
        ],
        trending_items=[
            {"menu": str(row["menu"])}
            for row in (instagram_payload.get("trending_items") or [])
            if isinstance(row, dict) and isinstance(row.get("menu"), str)
        ],
        avoid_items=[
            {"menu": str(row["menu"])}
            for row in (instagram_payload.get("avoid_items") or [])
            if isinstance(row, dict) and isinstance(row.get("menu"), str)
        ],
        best_posting_window=(
            {
                "peak_day": instagram_payload.get("best_posting_window", {}).get("peak_day"),
                "peak_hour": instagram_payload.get("best_posting_window", {}).get("peak_hour"),
                "primary_meal_period": instagram_payload.get("best_posting_window", {}).get(
                    "primary_meal_period"
                ),
            }
            if isinstance(instagram_payload.get("best_posting_window"), dict)
            else None
        ),
    )

    return {
        "top_promote": computed["top_promote"],
        "top_avoid": computed["top_avoid"],
        "puzzle_opportunity_pool": computed["puzzle_opportunity_pool"],
        "ranked_candidates": computed["ranked_candidates"],
        "ranked_candidates_total_count": computed["ranked_candidates_total_count"],
        "best_posting_window": computed["best_posting_window"],
        "best_posting_window_summary": computed["best_posting_window_summary"],
        "items_total_count": promotion.items_total_count,
        "items_truncated": promotion.items_truncated,
    }

