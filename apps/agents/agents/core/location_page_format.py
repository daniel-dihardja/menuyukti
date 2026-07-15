"""Markdown formatters for location-page GraphQL payloads (basics, hours, quick profile)."""

from __future__ import annotations

from typing import Any

_WEEKDAY_ORDER = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


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


def fmt_manual_brief_hints(raw_loc: dict[str, Any]) -> str:
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

    for spec in (
        ("valueProposition", "Hero promise"),
        ("aboutStory", "About / story"),
        ("topicsToAvoid", "Topics or visuals to avoid"),
        ("notes", "Additional location information"),
    ):
        line = _str_line(qp, spec[0], spec[1])
        if line:
            lines.append(line)

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


def fmt_opening_hours(raw_loc: dict[str, Any]) -> str:
    """Render opening hours in weekday order; closed when open/close times are empty."""
    raw_hours = raw_loc.get("openingHours")
    if not isinstance(raw_hours, list) or not raw_hours:
        return "## Opening hours\n\n_(not set)_"

    by_day: dict[str, dict[str, str]] = {}
    for row in raw_hours:
        if not isinstance(row, dict):
            continue
        day = str(row.get("dayOfWeek") or "").strip().lower()
        if not day:
            continue
        by_day[day] = {
            "openTime": str(row.get("openTime") or "").strip(),
            "closeTime": str(row.get("closeTime") or "").strip(),
        }

    lines: list[str] = ["## Opening hours"]
    for day in _WEEKDAY_ORDER:
        row = by_day.get(day)
        if row is None:
            lines.append(f"- **{day}**: closed")
            continue
        open_time = row["openTime"]
        close_time = row["closeTime"]
        if open_time and close_time:
            lines.append(f"- **{day}**: {open_time}–{close_time}")
        else:
            lines.append(f"- **{day}**: closed")
    return "\n".join(lines)


def fmt_location_basics(raw_loc: dict[str, Any]) -> str:
    """Render location identity fields from the location page."""
    lines: list[str] = ["## Location basics"]
    identity: list[str] = []
    for key, label in (
        ("name", "Name"),
        ("street", "Street"),
        ("city", "City"),
        ("country", "Country"),
        ("currency", "Currency"),
    ):
        raw = raw_loc.get(key)
        if isinstance(raw, str) and raw.strip():
            identity.append(f"- **{label}**: {raw.strip()}")
    if identity:
        lines.extend(identity)
    else:
        lines.append("_(no basics set)_")
    return "\n".join(lines)


def format_location_page_markdown(raw_loc: dict[str, Any]) -> str:
    """Format location-page GraphQL payload as Markdown for chat and tooling."""
    sections = [
        fmt_location_basics(raw_loc),
        fmt_opening_hours(raw_loc),
    ]
    manual_md = fmt_manual_brief_hints(raw_loc)
    if manual_md:
        sections.append(manual_md)
    return "\n\n".join(sections)
