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


def _str_list_line(qp: dict[str, Any], key: str, label: str) -> str | None:
    value = qp.get(key)
    if not isinstance(value, list) or not value:
        return None
    items = [str(x).strip() for x in value if isinstance(x, str) and str(x).strip()]
    if not items:
        return None
    return f"- **{label}**: {', '.join(items)}"


def _str_line(qp: dict[str, Any], key: str, label: str) -> str | None:
    value = qp.get(key)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    return f"- **{label}**: {text}"


def _fmt_manual_brief_hints(raw_loc: dict[str, Any]) -> str:
    """Markdown for owner-provided quick profile (camelCase GraphQL keys).

    Renders the full Instagram-readiness profile so downstream graphs can use the
    venue's stable facts (cuisine, positioning, service modes, links, guardrails)
    without re-asking the owner for them per-campaign. Keys mirror the validator
    in ``graphql.services.manual_quick_profile``.
    """
    mb = raw_loc.get("manualBriefInput")
    if not isinstance(mb, dict):
        return ""
    qp = mb.get("quickProfile")
    if not isinstance(qp, dict) or not qp:
        return ""
    lines: list[str] = [
        "## Owner-provided brief hints (manual)",
        "_Declared by the venue owner in settings — stable across campaigns._",
    ]

    # Positioning & cuisine.
    line = _str_list_line(qp, "venueConcepts", "Venue types")
    if line:
        lines.append(line)
    elif isinstance(qp.get("venueConcept"), str) and qp["venueConcept"].strip():
        lines.append(f"- **Venue type**: {qp['venueConcept'].strip()}")

    for spec in (
        ("cuisineTypes", "Cuisine types"),
        ("serviceModes", "Service modes"),
        ("ambienceTags", "Ambience"),
        ("dietaryOptions", "Dietary options"),
        ("postLanguages", "Post languages"),
    ):
        line = _str_list_line(qp, spec[0], spec[1])
        if line:
            lines.append(line)

    line = _str_line(qp, "priceTier", "Price tier")
    if line:
        lines.append(line)

    serves_alcohol = qp.get("servesAlcohol")
    if isinstance(serves_alcohol, bool):
        lines.append(
            f"- **Serves alcohol**: {'yes' if serves_alcohol else 'no'} "
            "(respect responsible-drinking and local alcohol-advertising rules when true)"
        )

    # Audience & defaults.
    for spec in (
        ("guestTags", "Guest context"),
        ("locationFocus", "Location focus (meal periods)"),
        ("socialGoals", "Default social goals (overridable per campaign)"),
        ("tonePresets", "Tone presets"),
    ):
        line = _str_list_line(qp, spec[0], spec[1])
        if line:
            lines.append(line)
    if not _str_list_line(qp, "tonePresets", "Tone presets"):
        legacy_t = qp.get("tonePreset")
        if isinstance(legacy_t, str) and legacy_t.strip():
            lines.append(f"- **Tone preset**: {legacy_t.strip()}")

    vc_video = qp.get("videoComfort")
    if isinstance(vc_video, bool):
        lines.append(f"- **Comfortable with Reels / short video**: {'yes' if vc_video else 'no'}")

    # Brand & guardrails.
    for spec in (
        ("valueProposition", "Hero promise"),
        ("aboutStory", "About / story"),
        ("topicsToAvoid", "Topics or visuals to avoid"),
        ("notes", "Notes"),
    ):
        line = _str_line(qp, spec[0], spec[1])
        if line:
            lines.append(line)

    # Profile, contact & link-in-bio destinations.
    profile_lines: list[str] = []
    handle = qp.get("instagramHandle")
    if isinstance(handle, str) and handle.strip():
        profile_lines.append(f"- **Instagram handle**: @{handle.strip().lstrip('@')}")
    for spec in (
        ("neighborhood", "Neighborhood"),
        ("phone", "Phone"),
        ("contactEmail", "Contact email"),
        ("websiteUrl", "Website"),
        ("reservationUrl", "Reservation link"),
        ("onlineOrderUrl", "Online order link"),
        ("menuUrl", "Menu link"),
        ("googleMapsUrl", "Google Maps / directions"),
    ):
        line = _str_line(qp, spec[0], spec[1])
        if line:
            profile_lines.append(line)
    if profile_lines:
        lines.append("")
        lines.append("**Profile, contact & link-in-bio:**")
        lines.extend(profile_lines)

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
            {"id": str(location_id), "locationId": location_id},
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

        ai_social = _fmt_ai_social_settings(loc_data)
        if ai_social:
            sections.append(ai_social)

        if owner_notes_md:
            sections.append(owner_notes_md)

        return "\n\n".join(sections)

    return get_location_profile
