"""LangChain tool: fetch the location profile and operating signals for the milestone venue."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_location_operating_signals,
)
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import LOCATION_QUERY
from langchain_core.tools import BaseTool, tool


def _pct(value: float) -> str:
    return f"{value * 100:.0f}%"


def _fmt_operating_profile(op: dict[str, Any], currency: str) -> str:
    lines: list[str] = []

    pattern = op.get("operatingPattern") or ""
    dining = op.get("diningFocus") or ""
    if pattern:
        lines.append(f"- **Operating pattern**: {pattern}")
    if dining:
        lines.append(f"- **Dining focus**: {dining}")

    peak_day = op.get("peakDay") or ""
    primary_period = op.get("primaryMealPeriod") or ""
    active_periods = op.get("activeMealPeriods") or []
    if peak_day:
        lines.append(f"- **Peak day**: {peak_day}")
    if primary_period:
        lines.append(f"- **Primary meal period**: {primary_period}")
    if active_periods:
        lines.append(f"- **Active meal periods**: {', '.join(active_periods)}")

    weekday = op.get("weekdayShare")
    weekend = op.get("weekendShare")
    if weekday is not None and weekend is not None:
        lines.append(f"- **Weekday / Weekend split**: {_pct(weekday)} weekday, {_pct(weekend)} weekend")

    avg_order = op.get("avgOrderSize")
    if avg_order is not None:
        cur = f" {currency}" if currency else ""
        lines.append(f"- **Avg order size**: {avg_order:.1f}{cur}")

    total_orders = op.get("totalOrders")
    if total_orders is not None:
        lines.append(f"- **Total orders in period**: {total_orders:,}")

    # Day-of-week breakdown (top 3 by share)
    dow = op.get("dayOfWeekBreakdown") or []
    if dow:
        top_days = sorted(dow, key=lambda r: r.get("share", 0), reverse=True)[:3]
        day_parts = [f"{r['day']} ({_pct(r['share'])})" for r in top_days if r.get("day")]
        if day_parts:
            lines.append(f"- **Busiest days**: {', '.join(day_parts)}")

    # Meal period breakdown
    mpb = op.get("mealPeriodBreakdown") or []
    if mpb:
        active = [r for r in mpb if r.get("orderCount", 0) > 0]
        active_sorted = sorted(active, key=lambda r: r.get("share", 0), reverse=True)
        mp_parts = [
            f"{r.get('label') or r.get('period')} ({_pct(r['share'])})"
            for r in active_sorted
            if r.get("share", 0) > 0
        ]
        if mp_parts:
            lines.append(f"- **Meal period breakdown**: {', '.join(mp_parts)}")

    return "\n".join(lines)


def _fmt_category_mix(cm: dict[str, Any]) -> str:
    lines: list[str] = []
    top_cat = cm.get("topRevenueCategory")
    if top_cat:
        lines.append(f"- **Top revenue category**: {top_cat}")
    rows = cm.get("rows") or []
    if rows:
        sorted_rows = sorted(rows, key=lambda r: r.get("revenueShare", 0), reverse=True)
        for r in sorted_rows[:5]:
            cat = r.get("category") or "Uncategorised"
            rev_share = r.get("revenueShare", 0)
            top_item = r.get("topItem") or ""
            top_note = f" — top item: {top_item}" if top_item else ""
            lines.append(f"  - {cat}: {_pct(rev_share)} of revenue{top_note}")
    return "\n".join(lines)


def _fmt_top_items(pmi: dict[str, Any]) -> str:
    items = pmi.get("items") or []
    if not items:
        return ""
    sorted_items = sorted(items, key=lambda r: r.get("quantity", 0), reverse=True)[:8]
    lines: list[str] = []
    for r in sorted_items:
        name = r.get("menu") or ""
        qty = r.get("quantity") or 0
        cat = r.get("menuCategory") or ""
        peak_day = r.get("peakDay") or ""
        peak_hour = r.get("peakHour")
        cat_note = f" [{cat}]" if cat else ""
        peak_parts: list[str] = []
        if peak_day:
            peak_parts.append(peak_day)
        if peak_hour is not None:
            peak_parts.append(f"{peak_hour:02d}:00")
        peak_note = f" — peak: {', '.join(peak_parts)}" if peak_parts else ""
        lines.append(f"  - {name}{cat_note}: {qty:,} orders{peak_note}")
    return "\n".join(lines)


def make_get_location_profile_tool(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_location_profile() -> str:
        """Return the venue's location profile and operating signals as structured Markdown.

        Includes: venue name/city/country/currency, operating pattern, peak day, meal period
        breakdown, weekday vs weekend split, category revenue mix, and top menu items by volume.
        Use this to anchor the Venue snapshot and inform Content pillars, Audience hypotheses,
        and Tone guardrails in the brand brief.
        Returns a Markdown document or an error message when the location is not found.
        """
        # 1. Basic location identity
        loc_data = await graphql_post(
            client,
            LOCATION_QUERY,
            {"id": str(location_id)},
            user_id,
        )
        raw_loc = loc_data.get("location")
        if not isinstance(raw_loc, dict):
            return "Location not found."

        name = raw_loc.get("name") or ""
        city = raw_loc.get("city") or ""
        country = raw_loc.get("country") or ""
        currency = raw_loc.get("currency") or ""

        identity_lines: list[str] = []
        if name:
            identity_lines.append(f"- **Name**: {name}")
        if city:
            identity_lines.append(f"- **City**: {city}")
        if country:
            identity_lines.append(f"- **Country**: {country}")
        if currency:
            identity_lines.append(f"- **Currency**: {currency}")

        sections: list[str] = ["## Location profile"]
        if identity_lines:
            sections.append("\n".join(identity_lines))
        else:
            sections.append("_No profile fields set._")

        # 2. Operating signals from latest analytics run
        signals = await fetch_location_operating_signals(location_id, user_id, client=client)

        run = signals.get("analytics_run")
        if run is None:
            sections.append(
                "\n_No analytics run found for this location — operating signals unavailable._"
            )
            return "\n\n".join(sections)

        pmi = signals.get("promotion_menu_items")
        period_start = ""
        period_end = ""
        if isinstance(pmi, dict):
            period_start = pmi.get("periodStart") or ""
            period_end = pmi.get("periodEnd") or ""
        run_name = run.get("name") or ""
        period_label = ""
        if period_start and period_end:
            period_label = f" ({period_start} – {period_end})"
        elif run_name:
            period_label = f" ({run_name})"

        op = signals.get("operating_profile")
        if op:
            sections.append(f"## Operating profile{period_label}")
            sections.append(_fmt_operating_profile(op, currency))

        cm = signals.get("category_mix")
        if cm:
            sections.append("## Category mix")
            sections.append(_fmt_category_mix(cm))

        if pmi:
            top_items_md = _fmt_top_items(pmi)
            if top_items_md:
                sections.append("## Top menu items by volume")
                sections.append(top_items_md)

        return "\n\n".join(sections)

    return get_location_profile
