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


def _fmt_manual_brief_hints(raw_loc: dict[str, Any]) -> str:
    """Markdown for owner-provided quick profile (camelCase GraphQL keys)."""
    mb = raw_loc.get("manualBriefInput")
    if not isinstance(mb, dict):
        return ""
    qp = mb.get("quickProfile")
    if not isinstance(qp, dict) or not qp:
        return ""
    lines: list[str] = [
        "## Owner-provided brief hints (manual)",
        "_Declared by the venue owner in settings — not inferred from sales data._",
    ]
    vcs = qp.get("venueConcepts")
    if isinstance(vcs, list) and vcs:
        lines.append(f"- **Venue types**: {', '.join(str(x) for x in vcs)}")
    else:
        legacy_v = qp.get("venueConcept")
        if isinstance(legacy_v, str) and legacy_v.strip():
            lines.append(f"- **Venue type**: {legacy_v.strip()}")

    sg = qp.get("socialGoals")
    if isinstance(sg, list) and sg:
        lines.append(f"- **Social goals**: {', '.join(str(x) for x in sg)}")

    gt = qp.get("guestTags")
    if isinstance(gt, list) and gt:
        lines.append(f"- **Guest context**: {', '.join(str(x) for x in gt)}")

    lf = qp.get("locationFocus")
    if isinstance(lf, list) and lf:
        lines.append(f"- **Location focus (meal periods)**: {', '.join(str(x) for x in lf)}")

    tps = qp.get("tonePresets")
    if isinstance(tps, list) and tps:
        lines.append(f"- **Tone presets**: {', '.join(str(x) for x in tps)}")
    else:
        legacy_t = qp.get("tonePreset")
        if isinstance(legacy_t, str) and legacy_t.strip():
            lines.append(f"- **Tone preset**: {legacy_t.strip()}")

    vc_video = qp.get("videoComfort")
    if isinstance(vc_video, bool):
        lines.append(f"- **Comfortable with Reels / short video**: {'yes' if vc_video else 'no'}")

    notes = qp.get("notes")
    if isinstance(notes, str) and notes.strip():
        lines.append(f"- **Notes**: {notes.strip()}")
    if len(lines) <= 2:
        return ""
    return "\n".join(lines)


def _fmt_ai_social_settings(data: dict[str, Any]) -> str:
    """Markdown for AI-generated location_social_settings (may be empty)."""
    raw = data.get("locationSocialSettings")
    if not isinstance(raw, dict):
        return ""
    tone = raw.get("tone")
    personality = raw.get("brandPersonality")
    pillars = raw.get("contentPillars") or []
    platforms = raw.get("platformFocus") or []
    hashtags = raw.get("brandHashtags") or []
    avoid = raw.get("avoidTopics") or []
    audience = raw.get("targetAudience")
    has_any = bool(
        (isinstance(tone, str) and tone.strip())
        or (isinstance(personality, str) and personality.strip())
        or (isinstance(pillars, list) and len(pillars) > 0)
        or (isinstance(platforms, list) and len(platforms) > 0)
        or (isinstance(hashtags, list) and len(hashtags) > 0)
        or (isinstance(avoid, list) and len(avoid) > 0)
        or (isinstance(audience, str) and audience.strip())
    )
    if not has_any:
        return ""
    lines: list[str] = [
        "## AI-generated location social settings",
        "_Produced by automation — not direct owner input. Use as secondary context._",
    ]
    if isinstance(tone, str) and tone.strip():
        lines.append(f"- **Tone**: {tone.strip()}")
    if isinstance(personality, str) and personality.strip():
        lines.append(f"- **Brand personality**: {personality.strip()}")
    if isinstance(pillars, list) and pillars:
        lines.append(f"- **Content pillars**: {', '.join(str(x) for x in pillars)}")
    if isinstance(platforms, list) and platforms:
        lines.append(f"- **Platform focus**: {', '.join(str(x) for x in platforms)}")
    if isinstance(hashtags, list) and hashtags:
        lines.append(f"- **Brand hashtags**: {', '.join(str(x) for x in hashtags)}")
    if isinstance(avoid, list) and avoid:
        lines.append(f"- **Avoid topics**: {', '.join(str(x) for x in avoid)}")
    if isinstance(audience, str) and audience.strip():
        lines.append(f"- **Target audience (AI)**: {audience.strip()}")
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
            {"id": str(location_id), "locationId": location_id},
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

        manual_md = _fmt_manual_brief_hints(raw_loc)
        if manual_md:
            sections.append(manual_md)

        # 2. Operating signals from latest analytics run
        signals = await fetch_location_operating_signals(location_id, user_id, client=client)

        run = signals.get("analytics_run")
        if run is None:
            sections.append(
                "\n_No analytics run found for this location — operating signals unavailable._"
            )
            ai_social = _fmt_ai_social_settings(loc_data)
            if ai_social:
                sections.append(ai_social)
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

        ai_social = _fmt_ai_social_settings(loc_data)
        if ai_social:
            sections.append(ai_social)

        return "\n\n".join(sections)

    return get_location_profile
