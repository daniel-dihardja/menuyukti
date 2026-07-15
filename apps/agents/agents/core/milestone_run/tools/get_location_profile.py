"""LangChain tool: fetch the location profile and operating signals for the milestone venue."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.core.location_page_format import fmt_manual_brief_hints
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
        lines.append(
            f"- **Weekday / Weekend split**: {_pct(weekday)} weekday, {_pct(weekend)} weekend"
        )

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


def _fmt_fundamental_signals(instagram: dict[str, Any], currency: str) -> str:
    lines: list[str] = []
    fundamental = instagram.get("fundamentalSignals")
    if not isinstance(fundamental, dict):
        return ""
    sales = fundamental.get("sales")
    if isinstance(sales, dict):
        cur = f" {currency}" if currency else ""
        lines.append(f"- **Total revenue**: {float(sales.get('totalRevenue') or 0.0):,.2f}{cur}")
        lines.append(f"- **Total items sold**: {int(sales.get('totalItemsSold') or 0):,}")
        lines.append(f"- **Unique menu items sold**: {int(sales.get('uniqueMenuItems') or 0):,}")
        lines.append(f"- **Avg item price**: {float(sales.get('avgItemPrice') or 0.0):.2f}{cur}")
    category_focus = fundamental.get("categoryFocus")
    if isinstance(category_focus, dict) and category_focus.get("category"):
        lines.append(f"- **Top revenue category**: {category_focus.get('category')}")
    trending = fundamental.get("trendingItems")
    if isinstance(trending, list) and trending:
        top = [x.get("menu") for x in trending[:5] if isinstance(x, dict) and x.get("menu")]
        if top:
            lines.append(f"- **Trending items**: {', '.join(str(x) for x in top)}")
    return "\n".join(lines)


def _fmt_matrix_signals(instagram: dict[str, Any]) -> str:
    additional = instagram.get("additionalSignals")
    if not isinstance(additional, dict):
        return ""
    matrix = additional.get("matrixSignals")
    if not isinstance(matrix, dict):
        return ""
    heroes = matrix.get("contentHeroes")
    avoid = matrix.get("avoidItems")
    lines: list[str] = []
    if isinstance(heroes, list) and heroes:
        hero_names: list[str] = []
        for hero in heroes[:6]:
            if not isinstance(hero, dict):
                continue
            menu = hero.get("menu")
            if isinstance(menu, str) and menu.strip():
                hero_names.append(menu.strip())
        if hero_names:
            lines.append(f"- **Content heroes**: {', '.join(hero_names)}")
    if isinstance(avoid, list) and avoid:
        avoid_names: list[str] = []
        for avoided in avoid[:6]:
            if not isinstance(avoided, dict):
                continue
            menu = avoided.get("menu")
            if isinstance(menu, str) and menu.strip():
                avoid_names.append(menu.strip())
        if avoid_names:
            lines.append(f"- **Use cautiously**: {', '.join(avoid_names)}")
    return "\n".join(lines)


def _fmt_ai_social_settings(location_data: dict[str, Any]) -> str:
    """Compatibility helper retained for campaign-brief imports.

    AI social settings were removed from location GraphQL payloads in favor of
    owner-provided manual brief input (`manualBriefInput.quickProfile`).
    Keep this helper as a stable no-op until all downstream imports are cleaned
    up.
    """
    del location_data
    return ""


def _fmt_milestone_campaign_brief_owner_notes(context: dict[str, Any]) -> str:
    """Markdown for optional owner notes from the campaign-brief milestone Input tab."""
    raw = context.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "restaurant_campaign_brief":
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    text = notes.strip()
    if not text:
        return ""
    return (
        "## Milestone campaign_brief input (owner)\n\n"
        "_User-supplied notes from the milestone Input tab — incorporate when shaping pillars, "
        "angles, and tone guardrails; do not treat as verified sales facts._\n\n"
        f"{text}"
    )


def make_get_location_profile_tool(
    context: dict[str, Any],
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
        and Tone guardrails in the campaign brief.
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

        owner_notes_md = _fmt_milestone_campaign_brief_owner_notes(context)

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

        manual_md = fmt_manual_brief_hints(raw_loc)
        if manual_md:
            sections.append(manual_md)

        # 2. Operating signals from latest analytics run
        signals = await fetch_location_operating_signals(location_id, user_id, client=client)

        run = signals.get("analytics_run")
        if run is None:
            sections.append(
                "\n_No analytics run found for this location — operating signals unavailable._"
            )
            if owner_notes_md:
                sections.append(owner_notes_md)
            return "\n\n".join(sections)

        instagram = signals.get("instagram_signals")
        capabilities = instagram.get("capabilities") if isinstance(instagram, dict) else None
        period_start = ""
        period_end = ""
        if isinstance(instagram, dict):
            dt = instagram.get("additionalSignals", {}).get("datetimeSignals", {})
            if isinstance(dt, dict):
                headline = dt.get("periodHeadline")
                if isinstance(headline, dict):
                    period_start = str(headline.get("periodStart") or "")
                    period_end = str(headline.get("periodEnd") or "")
        run_name = run.get("name") or ""
        period_label = ""
        if period_start and period_end:
            period_label = f" ({period_start} – {period_end})"
        elif run_name:
            period_label = f" ({run_name})"

        if isinstance(capabilities, dict):
            sections.append("## Signal capabilities")
            enabled = capabilities.get("enabledBlocks") or []
            sections.append(
                "\n".join(
                    [
                        f"- **Has order-level data**: {'yes' if capabilities.get('hasOrderId') else 'no'}",
                        f"- **Has datetime data**: {'yes' if capabilities.get('hasDatetime') else 'no'}",
                        f"- **Enabled blocks**: {', '.join(str(x) for x in enabled) if isinstance(enabled, list) and enabled else 'fundamental_signals'}",
                    ]
                )
            )

        if isinstance(instagram, dict):
            sections.append("## Fundamental signals")
            sections.append(_fmt_fundamental_signals(instagram, currency))

        dt = (
            instagram.get("additionalSignals", {}).get("datetimeSignals")
            if isinstance(instagram, dict)
            else None
        )
        if isinstance(dt, dict):
            op = dt.get("bestPostingWindow")
            sections.append(f"## Operating profile{period_label}")
            sections.append(_fmt_operating_profile(op if isinstance(op, dict) else {}, currency))

        matrix_md = _fmt_matrix_signals(instagram if isinstance(instagram, dict) else {})
        if matrix_md:
            sections.append("## Additional matrix signals")
            sections.append(matrix_md)

        if owner_notes_md:
            sections.append(owner_notes_md)

        return "\n\n".join(sections)

    return get_location_profile
