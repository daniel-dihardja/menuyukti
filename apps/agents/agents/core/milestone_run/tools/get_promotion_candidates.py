"""LangChain tool: fetch and rank promotion candidate menu items."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_location_operating_signals,
)
from langchain_core.tools import BaseTool, tool

# Cap rows + field verbosity: large tool messages stall the ReAct model on the next turn
# and inflate the follow-up write_result_data tool call.
_MAX_RANKED_CANDIDATES_IN_TOOL = 30
_MAX_SIGNAL_REASONS_PER_ROW = 3
_MAX_SIGNAL_REASON_CHARS = 96
_JSON_SEPARATORS = (",", ":")


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


def _slim_signal_reasons(reasons: Any) -> list[str]:
    if not isinstance(reasons, list):
        return []
    out: list[str] = []
    for raw in reasons[:_MAX_SIGNAL_REASONS_PER_ROW]:
        s = str(raw).strip()
        if not s:
            continue
        if len(s) > _MAX_SIGNAL_REASON_CHARS:
            s = s[: _MAX_SIGNAL_REASON_CHARS - 1] + "…"
        out.append(s)
    return out


def _slim_ranked_export_row(row: dict[str, Any]) -> dict[str, Any]:
    """Minimal row shape aligned with web `promotionRankedCandidateSchema` (passthrough allows extras)."""
    return {
        "menu": str(row.get("menu") or ""),
        "recommendation": str(row.get("recommendation") or ""),
        "score": float(row.get("score") or 0.0),
        "quantity": int(row.get("quantity") or 0),
        "totalRevenue": float(row.get("totalRevenue") or 0.0),
        "signalReasons": _slim_signal_reasons(row.get("signalReasons")),
    }


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2 == 1:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2.0


def _build_puzzle_pool(scored: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], float]:
    puzzle_items = [x for x in scored if str(x.get("matrixCategory") or "").lower() == "puzzle"]
    if not puzzle_items:
        return [], 0.0

    max_qty = max(int(x.get("quantity") or 0) for x in puzzle_items) or 1
    max_rev = max(float(x.get("totalRevenue") or 0.0) for x in puzzle_items) or 1.0
    max_margin = max(float(x.get("contributionMarginPct") or 0.0) for x in puzzle_items) or 1.0

    for row in puzzle_items:
        qty_norm = float(row.get("quantity") or 0) / max_qty
        rev_norm = float(row.get("totalRevenue") or 0.0) / max_rev
        margin_norm = float(row.get("contributionMarginPct") or 0.0) / max_margin

        modifier = 0.0
        reasons = row.get("signalReasons") or []
        if any("rising trend" in str(r).lower() for r in reasons):
            modifier += 0.08
        if any("content hero" in str(r).lower() for r in reasons):
            modifier += 0.05
        if str(row.get("matrixAction") or "").lower() == "promote":
            modifier += 0.08
        if str(row.get("matrixAction") or "").lower() == "remove":
            modifier -= 0.20
        if str(row.get("recommendation") or "").lower() == "avoid":
            modifier -= 0.12

        puzzle_score = ((qty_norm * 0.35) + (rev_norm * 0.35) + (margin_norm * 0.20) + modifier) * 100
        row["puzzleOpportunityScore"] = round(puzzle_score, 2)

    scores = [float(x["puzzleOpportunityScore"]) for x in puzzle_items]
    threshold = _median(scores)
    selected = [x for x in puzzle_items if float(x["puzzleOpportunityScore"]) >= threshold]

    if not selected:
        selected = sorted(puzzle_items, key=lambda x: float(x["puzzleOpportunityScore"]), reverse=True)[:1]

    # Secondary cap for overly large pools.
    if len(selected) > 8:
        raised_threshold = threshold + 5.0
        raised = [x for x in selected if float(x["puzzleOpportunityScore"]) >= raised_threshold]
        selected = raised if raised else selected
        if len(selected) > 8:
            selected = sorted(selected, key=lambda x: float(x["puzzleOpportunityScore"]), reverse=True)[:8]

    selected.sort(key=lambda x: (-float(x["puzzleOpportunityScore"]), -int(x.get("quantity") or 0), x["menu"]))
    return selected, round(threshold, 2)


def _puzzle_why(row: dict[str, Any]) -> list[str]:
    bullets: list[str] = []
    qty = int(row.get("quantity") or 0)
    revenue = float(row.get("totalRevenue") or 0.0)
    margin = row.get("contributionMarginPct")
    if margin is not None:
        bullets.append(
            f"Balanced potential: qty {qty}, revenue {revenue:.2f}, margin signal {float(margin) * 100:.1f}%."
        )
    else:
        bullets.append(f"Balanced potential: qty {qty}, revenue {revenue:.2f}.")
    for r in (row.get("signalReasons") or [])[:2]:
        bullets.append(str(r))
    return bullets[:3]


def _puzzle_how_to_promote(row: dict[str, Any]) -> list[str]:
    menu = str(row.get("menu") or "this item")
    category = row.get("menuCategory") or row.get("menuCategoryDetail") or "menu"
    peak_day = row.get("peakDay")
    peak_hour = row.get("peakHour")
    timing = "near venue peak time"
    if peak_day and peak_hour is not None:
        timing = f"around {peak_day} {int(peak_hour):02d}:00"
    elif peak_day:
        timing = f"on {peak_day}"
    elif peak_hour is not None:
        timing = f"around {int(peak_hour):02d}:00"

    cta = "Try it this week and save this post for your next order."
    action = str(row.get("matrixAction") or "").lower()
    if action == "promote":
        cta = "Order now while this featured item is highlighted."
    elif action == "remove":
        cta = "Limited-time spotlight: try it before the menu refresh."

    return [
        f"Angle: position {menu} as a high-value {category} choice with clear sensory and value cues.",
        "Format: use a short Reel (prep + close-up) plus one carousel slide for price/value framing.",
        f"Timing & CTA: post {timing}; CTA: {cta}",
    ]


def make_get_promotion_candidates_tool(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_promotion_candidates() -> str:
        """Return ranked promotion signals from the latest analytics run as JSON text.

        Uses GraphQL promotionMenuItems + instagramSignals. The payload includes
        reporting period, posting window hints, top promote/avoid slices, puzzle pool
        with selected puzzle rows (why/how-to-promote), and the full ranked candidate list.
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

        heroes = (
            instagram.get("contentHeroes") if isinstance(instagram, dict) else None
        ) or []
        trending = (
            instagram.get("trendingItems") if isinstance(instagram, dict) else None
        ) or []
        avoid = (instagram.get("avoidItems") if isinstance(instagram, dict) else None) or []
        if not isinstance(heroes, list):
            heroes = []
        if not isinstance(trending, list):
            trending = []
        if not isinstance(avoid, list):
            avoid = []

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

        top_promote = [
            _slim_ranked_export_row(x) for x in scored if x["recommendation"] == "promote"
        ][:8]
        top_avoid = [_slim_ranked_export_row(x) for x in scored if x["recommendation"] == "avoid"][:8]
        selected_puzzles, puzzle_threshold = _build_puzzle_pool(scored)

        period_start = promotion.get("periodStart")
        period_end = promotion.get("periodEnd")

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

        puzzle_items_count = len(
            [x for x in scored if str(x.get("matrixCategory") or "").lower() == "puzzle"]
        )
        selected_payload: list[dict[str, Any]] = []
        for row in selected_puzzles:
            compact = {**row, "signalReasons": _slim_signal_reasons(row.get("signalReasons"))}
            selected_payload.append(
                {
                    **compact,
                    "whySelected": _puzzle_why(row),
                    "howToPromoteOnInstagram": _puzzle_how_to_promote(row),
                }
            )

        total_ranked = len(scored)
        ranked_slice = (
            scored if total_ranked <= _MAX_RANKED_CANDIDATES_IN_TOOL else scored[:_MAX_RANKED_CANDIDATES_IN_TOOL]
        )
        ranked_export = [_slim_ranked_export_row(r) for r in ranked_slice]

        payload: dict[str, Any] = {
            "analyticsRun": {"id": run.get("id"), "name": run.get("name")},
            "reportingPeriod": {"start": period_start, "end": period_end},
            "bestPostingWindow": posting if isinstance(posting, dict) else None,
            "bestPostingWindowSummary": posting_text,
            "totals": {"menuItemsEvaluated": len(scored)},
            "topPromote": top_promote,
            "topAvoid": top_avoid,
            "puzzleOpportunityPool": {
                "puzzleItemsFound": puzzle_items_count,
                "threshold": puzzle_threshold,
                "selectedCount": len(selected_puzzles),
                "selected": selected_payload,
            },
            "rankedCandidates": ranked_export,
            "rankedCandidatesTotalCount": total_ranked,
            "rankedCandidatesTruncated": total_ranked > len(ranked_export),
        }
        return json.dumps(payload, ensure_ascii=False, separators=_JSON_SEPARATORS)

    return get_promotion_candidates
