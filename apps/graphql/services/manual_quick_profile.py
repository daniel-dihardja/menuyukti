"""Validate and normalize owner `quick_profile` JSON for location_manual_brief_input."""

from __future__ import annotations

from typing import Any

VENUE_CONCEPTS = frozenset(
    {
        "cafe",
        "bistro",
        "restaurant",
        "fast_casual",
        "bar",
        "bakery_cafe",
        "fine_dining",
        "other",
    }
)
SOCIAL_GOALS = frozenset(
    {
        "awareness",
        "reservations",
        "walk_ins",
        "delivery",
        "events",
        "community",
    }
)
GUEST_TAGS = frozenset(
    {
        "office_lunch",
        "tourists",
        "families",
        "date_night",
        "nightlife",
        "neighborhood_locals",
        "students",
    }
)
TONE_PRESETS = frozenset({"warm", "professional", "playful", "minimal", "bold"})
LOCATION_FOCUS = frozenset({"breakfast", "brunch", "lunch", "dinner"})

_ALLOWED_TOP_KEYS = frozenset(
    {
        "venueConcepts",
        "venueConcept",
        "socialGoals",
        "guestTags",
        "tonePresets",
        "tonePreset",
        "locationFocus",
        "videoComfort",
        "notes",
    }
)
_MAX_NOTES_LEN = 280


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _parse_str_list(
    raw: Any, *, field_label: str, allowed: frozenset[str]
) -> list[str]:
    if not isinstance(raw, list):
        raise ValueError(f"{field_label} must be a list")
    out: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            raise ValueError(f"{field_label} entries must be strings")
        s = item.strip().lower()
        if not s:
            continue
        if s not in allowed:
            raise ValueError(f"Invalid {field_label} entry")
        out.append(s)
    return _dedupe_preserve_order(out)


def validate_and_normalize_quick_profile(raw: Any) -> dict[str, Any]:
    """Return a normalized dict suitable for JSONB storage.

    Multi-value fields are stored as lists (``venueConcepts``, ``tonePresets``, etc.).
    Legacy single-value ``venueConcept`` / ``tonePreset`` are accepted and merged.

    Raises ValueError on invalid shape or enum values.
    """
    if raw is None:
        return {}

    if not isinstance(raw, dict):
        raise ValueError("quickProfile must be a JSON object")

    unknown = set(raw.keys()) - _ALLOWED_TOP_KEYS
    if unknown:
        raise ValueError(f"Unknown quickProfile keys: {', '.join(sorted(unknown))}")

    out: dict[str, Any] = {}

    venues: list[str] = []
    vcs = raw.get("venueConcepts")
    if vcs is not None:
        venues.extend(_parse_str_list(vcs, field_label="venueConcepts", allowed=VENUE_CONCEPTS))
    legacy_vc = raw.get("venueConcept")
    if legacy_vc is not None:
        if not isinstance(legacy_vc, str):
            raise ValueError("venueConcept must be a string")
        s = legacy_vc.strip().lower()
        if s and s not in VENUE_CONCEPTS:
            raise ValueError("Invalid venueConcept")
        if s and s not in venues:
            venues.append(s)
    venues = _dedupe_preserve_order(venues)
    if venues:
        out["venueConcepts"] = venues

    sg = raw.get("socialGoals")
    if sg is not None:
        goals = _parse_str_list(sg, field_label="socialGoals", allowed=SOCIAL_GOALS)
        if goals:
            out["socialGoals"] = goals

    gt = raw.get("guestTags")
    if gt is not None:
        tags = _parse_str_list(gt, field_label="guestTags", allowed=GUEST_TAGS)
        if tags:
            out["guestTags"] = tags

    lf = raw.get("locationFocus")
    if lf is not None:
        focus = _parse_str_list(lf, field_label="locationFocus", allowed=LOCATION_FOCUS)
        if focus:
            out["locationFocus"] = focus

    tones: list[str] = []
    tps = raw.get("tonePresets")
    if tps is not None:
        tones.extend(_parse_str_list(tps, field_label="tonePresets", allowed=TONE_PRESETS))
    legacy_tp = raw.get("tonePreset")
    if legacy_tp is not None:
        if not isinstance(legacy_tp, str):
            raise ValueError("tonePreset must be a string")
        s = legacy_tp.strip().lower()
        if s and s not in TONE_PRESETS:
            raise ValueError("Invalid tonePreset")
        if s and s not in tones:
            tones.append(s)
    tones = _dedupe_preserve_order(tones)
    if tones:
        out["tonePresets"] = tones

    vc_video = raw.get("videoComfort")
    if vc_video is not None:
        if not isinstance(vc_video, bool):
            raise ValueError("videoComfort must be a boolean")
        out["videoComfort"] = vc_video

    notes = raw.get("notes")
    if notes is not None:
        if not isinstance(notes, str):
            raise ValueError("notes must be a string")
        stripped = notes.strip()
        if len(stripped) > _MAX_NOTES_LEN:
            raise ValueError(f"notes must be at most {_MAX_NOTES_LEN} characters")
        if stripped:
            out["notes"] = stripped

    return out


def is_quick_profile_empty(profile: dict[str, Any]) -> bool:
    # Default-off video alone is not meaningful stored state.
    return not profile or (
        set(profile.keys()) == {"videoComfort"} and profile.get("videoComfort") is False
    )
