"""LangChain tool: fetch and rank promotion candidate menu items."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_location_operating_signals,
)
from langchain_core.tools import BaseTool, tool


def _safe_float(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _score_promotion_item(
    item: dict[str, Any],
    *,
    hero_menus: set[str],
    trending_menus: set[str],
    avoid_menus: set[str],
    max_quantity: int,
    max_revenue: float,
) -> tuple[float, list[str], str]:
    menu = str(item.get("menu") or "")
    quantity = int(item.get("quantity") or 0)
    total_revenue = _safe_float(item.get("totalRevenue")) or 0.0
    matrix_category = str(item.get("category") or "").strip().lower()
    matrix_action = str(item.get("action") or "").strip().lower()

    score = 0.0
    reasons: list[str] = []

    if max_quantity > 0:
        demand_component = (quantity / max_quantity) * 30.0
        score += demand_component
    if max_revenue > 0:
        revenue_component = (total_revenue / max_revenue) * 35.0
        score += revenue_component

    if menu in hero_menus:
        score += 15.0
        reasons.append("Tagged as content hero in Instagram signals")
    if menu in trending_menus:
        score += 12.0
        reasons.append("Tagged as rising trend in Instagram signals")

    if matrix_category == "star":
        score += 10.0
        reasons.append("Menu engineering category is star")
    elif matrix_category == "puzzle":
        score += 5.0
        reasons.append("Menu engineering category is puzzle")
    elif matrix_category == "plow_horse":
        score += 3.0
        reasons.append("Menu engineering category is plow_horse")

    if matrix_action == "promote":
        score += 8.0
        reasons.append("Menu engineering action recommends promote")
    elif matrix_action == "remove":
        score -= 20.0
        reasons.append("Menu engineering action recommends remove")

    if menu in avoid_menus or matrix_category == "low_end":
        score -= 25.0
        reasons.append("Flagged as avoid or low_end")

    if score >= 55:
        recommendation = "promote"
    elif score >= 35:
        recommendation = "test"
    else:
        recommendation = "avoid"

    if not reasons:
        reasons.append("Included for full-menu coverage; no strong signal flags found")

    return round(score, 2), reasons, recommendation


def make_get_promotion_candidates_tool(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_promotion_candidates() -> str:
        """Return ranked promotion candidates for all menu items from latest analytics run.

        Uses GraphQL promotionMenuItems + instagramSignals and returns Markdown with:
        - period + posting window context
        - short top picks / avoid picks
        - full ranked JSON list (all menu items) with score and evidence
        """
        signals = await fetch_location_operating_signals(location_id, user_id, client=client)
        run = signals.get("analytics_run")
        promotion = signals.get("promotion_menu_items")
        instagram = signals.get("instagram_signals")

        if run is None:
            return "No analytics run found for this location. Promotion candidate signals are unavailable."
        if not isinstance(promotion, dict):
            return "Promotion menu items are unavailable for the latest analytics run."

        items_raw = promotion.get("items")
        if not isinstance(items_raw, list) or not items_raw:
            return "No promotion menu items found for the latest analytics run."

        heroes = instagram.get("contentHeroes") if isinstance(instagram, dict) else []
        trending = instagram.get("trendingItems") if isinstance(instagram, dict) else []
        avoid = instagram.get("avoidItems") if isinstance(instagram, dict) else []

        hero_menus = {
            str(x.get("menu"))
            for x in heroes
            if isinstance(x, dict) and isinstance(x.get("menu"), str) and x.get("menu")
        }
        trending_menus = {
            str(x.get("menu"))
            for x in trending
            if isinstance(x, dict) and isinstance(x.get("menu"), str) and x.get("menu")
        }
        avoid_menus = {
            str(x.get("menu"))
            for x in avoid
            if isinstance(x, dict) and isinstance(x.get("menu"), str) and x.get("menu")
        }

        max_quantity = max(int(x.get("quantity") or 0) for x in items_raw)
        max_revenue = max((_safe_float(x.get("totalRevenue")) or 0.0) for x in items_raw)

        scored: list[dict[str, Any]] = []
        for item in items_raw:
            if not isinstance(item, dict):
                continue
            menu = str(item.get("menu") or "")
            if not menu:
                continue
            score, reasons, recommendation = _score_promotion_item(
                item,
                hero_menus=hero_menus,
                trending_menus=trending_menus,
                avoid_menus=avoid_menus,
                max_quantity=max_quantity,
                max_revenue=max_revenue,
            )
            scored.append(
                {
                    "menu": menu,
                    "recommendation": recommendation,
                    "score": score,
                    "quantity": int(item.get("quantity") or 0),
                    "totalRevenue": _safe_float(item.get("totalRevenue")) or 0.0,
                    "menuCategory": item.get("menuCategory"),
                    "menuCategoryDetail": item.get("menuCategoryDetail"),
                    "peakDay": item.get("peakDay"),
                    "peakHour": item.get("peakHour"),
                    "matrixCategory": item.get("category"),
                    "matrixAction": item.get("action"),
                    "contributionMarginPct": _safe_float(item.get("contributionMarginPercentage")),
                    "signalReasons": reasons,
                }
            )

        scored.sort(key=lambda row: (-float(row["score"]), -int(row["quantity"]), row["menu"]))

        top_promote = [x for x in scored if x["recommendation"] == "promote"][:8]
        top_avoid = [x for x in scored if x["recommendation"] == "avoid"][:8]

        period_start = promotion.get("periodStart")
        period_end = promotion.get("periodEnd")
        period_text = f"{period_start} to {period_end}" if period_start and period_end else "n/a"

        posting = instagram.get("bestPostingWindow") if isinstance(instagram, dict) else None
        posting_parts: list[str] = []
        if isinstance(posting, dict):
            if posting.get("peakDay"):
                posting_parts.append(f"peak day: {posting.get('peakDay')}")
            if posting.get("peakHour") is not None:
                posting_parts.append(f"peak hour: {posting.get('peakHour')}:00")
            if posting.get("primaryMealPeriod"):
                posting_parts.append(f"primary meal period: {posting.get('primaryMealPeriod')}")
        posting_text = ", ".join(posting_parts) if posting_parts else "not available"

        lines: list[str] = [
            "## Promotion candidates signals",
            f"- Analytics run: {run.get('name') or run.get('id')}",
            f"- Reporting period: {period_text}",
            f"- Best posting window: {posting_text}",
            f"- Total menu items evaluated: {len(scored)}",
            "",
            "## Top promote picks",
        ]

        if top_promote:
            for row in top_promote:
                lines.append(
                    f"- {row['menu']} (score {row['score']}, qty {row['quantity']}, revenue {row['totalRevenue']:.2f})"
                )
        else:
            lines.append("- No strong promote picks found from current signals.")

        lines.extend(["", "## Top avoid picks"])
        if top_avoid:
            for row in top_avoid:
                lines.append(
                    f"- {row['menu']} (score {row['score']}, qty {row['quantity']}, revenue {row['totalRevenue']:.2f})"
                )
        else:
            lines.append("- No avoid picks found from current signals.")

        lines.extend(
            [
                "",
                "## Full ranked candidate list (JSON)",
                "```json",
                json.dumps(scored, ensure_ascii=True, indent=2),
                "```",
            ]
        )
        return "\n".join(lines)

    return get_promotion_candidates
