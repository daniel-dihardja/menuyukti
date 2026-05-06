"""Validate and normalize owner `quick_profile` JSON for location_manual_brief_input."""

from __future__ import annotations

import re
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

CUISINE_TYPES = frozenset(
    {
        "italian",
        "indonesian",
        "indian",
        "japanese",
        "chinese",
        "thai",
        "korean",
        "vietnamese",
        "mexican",
        "mediterranean",
        "middle_eastern",
        "american",
        "french",
        "german",
        "spanish",
        "greek",
        "turkish",
        "fusion",
        "seafood",
        "steakhouse",
        "pizza",
        "burger",
        "bakery",
        "dessert",
        "healthy",
        "vegan_friendly",
        "other",
    }
)
SERVICE_MODES = frozenset({"dine_in", "takeaway", "delivery", "catering", "private_events"})
AMBIENCE_TAGS = frozenset(
    {
        "cozy",
        "lively",
        "romantic",
        "family_friendly",
        "quiet",
        "outdoor_seating",
        "dog_friendly",
        "wheelchair_accessible",
    }
)
POST_LANGUAGES = frozenset({"en", "de", "id", "es", "fr", "it", "ja", "zh", "pt", "ar", "tr", "nl"})
DIETARY_OPTIONS = frozenset(
    {
        "vegetarian",
        "vegan",
        "halal",
        "kosher",
        "gluten_free",
        "nut_free",
        "lactose_free",
    }
)
PRICE_TIERS = frozenset({"budget", "mid", "upscale", "premium"})

_ALLOWED_TOP_KEYS = frozenset(
    {
        # Existing taxonomy keys.
        "venueConcepts",
        "venueConcept",
        "socialGoals",
        "guestTags",
        "tonePresets",
        "tonePreset",
        "locationFocus",
        "videoComfort",
        "notes",
        # New taxonomy keys (Instagram-readiness review).
        "cuisineTypes",
        "serviceModes",
        "ambienceTags",
        "postLanguages",
        "dietaryOptions",
        "priceTier",
        "servesAlcohol",
        # New free-text identity / contact / discovery keys.
        "instagramHandle",
        "websiteUrl",
        "reservationUrl",
        "onlineOrderUrl",
        "menuUrl",
        "googleMapsUrl",
        "phone",
        "contactEmail",
        "neighborhood",
        # New brand / guardrail keys.
        "valueProposition",
        "aboutStory",
        "topicsToAvoid",
    }
)
_MAX_NOTES_LEN = 280
_MAX_URL_LEN = 500
_MAX_PHONE_LEN = 30
_MAX_EMAIL_LEN = 254
_MAX_INSTAGRAM_HANDLE_LEN = 32
_MAX_NEIGHBORHOOD_LEN = 80
_MAX_VALUE_PROPOSITION_LEN = 140
_MAX_ABOUT_STORY_LEN = 800
_MAX_TOPICS_TO_AVOID_LEN = 280

_INSTAGRAM_HANDLE_RE = re.compile(r"^[A-Za-z0-9._]{1,32}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _parse_str_list(raw: Any, *, field_label: str, allowed: frozenset[str]) -> list[str]:
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


def _parse_text(
    raw: Any,
    *,
    field_label: str,
    max_len: int,
) -> str | None:
    """Validate optional free-text; return ``None`` when empty after trimming."""
    if not isinstance(raw, str):
        raise ValueError(f"{field_label} must be a string")
    stripped = raw.strip()
    if not stripped:
        return None
    if len(stripped) > max_len:
        raise ValueError(f"{field_label} must be at most {max_len} characters")
    return stripped


def _parse_url(raw: Any, *, field_label: str) -> str | None:
    """Validate optional URL; require ``http(s)://`` scheme when non-empty."""
    text = _parse_text(raw, field_label=field_label, max_len=_MAX_URL_LEN)
    if text is None:
        return None
    lowered = text.lower()
    if not (lowered.startswith("http://") or lowered.startswith("https://")):
        raise ValueError(f"{field_label} must start with http:// or https://")
    return text


def _parse_instagram_handle(raw: Any) -> str | None:
    text = _parse_text(raw, field_label="instagramHandle", max_len=_MAX_INSTAGRAM_HANDLE_LEN)
    if text is None:
        return None
    candidate = text.lstrip("@").strip()
    if not candidate:
        return None
    if len(candidate) > _MAX_INSTAGRAM_HANDLE_LEN:
        raise ValueError(f"instagramHandle must be at most {_MAX_INSTAGRAM_HANDLE_LEN} characters")
    if not _INSTAGRAM_HANDLE_RE.match(candidate):
        raise ValueError("instagramHandle may only contain letters, numbers, dots, and underscores")
    return candidate


def _parse_email(raw: Any) -> str | None:
    text = _parse_text(raw, field_label="contactEmail", max_len=_MAX_EMAIL_LEN)
    if text is None:
        return None
    if not _EMAIL_RE.match(text):
        raise ValueError("contactEmail must be a valid email address")
    return text


def _parse_enum(raw: Any, *, field_label: str, allowed: frozenset[str]) -> str | None:
    if not isinstance(raw, str):
        raise ValueError(f"{field_label} must be a string")
    s = raw.strip().lower()
    if not s:
        return None
    if s not in allowed:
        raise ValueError(f"Invalid {field_label}")
    return s


def validate_and_normalize_quick_profile(raw: Any) -> dict[str, Any]:
    """Return a normalized dict suitable for JSONB storage.

    Multi-value fields are stored as lists (``venueConcepts``, ``tonePresets``, etc.).
    Legacy single-value ``venueConcept`` / ``tonePreset`` are accepted and merged.

    Free-text fields (``instagramHandle``, ``valueProposition``, etc.) are trimmed and
    omitted when empty so storage stays compact and ``is_quick_profile_empty`` keeps
    its sentinel-only semantics.

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
        text = _parse_text(notes, field_label="notes", max_len=_MAX_NOTES_LEN)
        if text is not None:
            out["notes"] = text

    cuisines = raw.get("cuisineTypes")
    if cuisines is not None:
        parsed = _parse_str_list(cuisines, field_label="cuisineTypes", allowed=CUISINE_TYPES)
        if parsed:
            out["cuisineTypes"] = parsed

    sm = raw.get("serviceModes")
    if sm is not None:
        parsed = _parse_str_list(sm, field_label="serviceModes", allowed=SERVICE_MODES)
        if parsed:
            out["serviceModes"] = parsed

    ambience = raw.get("ambienceTags")
    if ambience is not None:
        parsed = _parse_str_list(ambience, field_label="ambienceTags", allowed=AMBIENCE_TAGS)
        if parsed:
            out["ambienceTags"] = parsed

    languages = raw.get("postLanguages")
    if languages is not None:
        parsed = _parse_str_list(languages, field_label="postLanguages", allowed=POST_LANGUAGES)
        if parsed:
            out["postLanguages"] = parsed

    dietary = raw.get("dietaryOptions")
    if dietary is not None:
        parsed = _parse_str_list(dietary, field_label="dietaryOptions", allowed=DIETARY_OPTIONS)
        if parsed:
            out["dietaryOptions"] = parsed

    pt = raw.get("priceTier")
    if pt is not None:
        normalized_pt = _parse_enum(pt, field_label="priceTier", allowed=PRICE_TIERS)
        if normalized_pt is not None:
            out["priceTier"] = normalized_pt

    sa = raw.get("servesAlcohol")
    if sa is not None:
        if not isinstance(sa, bool):
            raise ValueError("servesAlcohol must be a boolean")
        out["servesAlcohol"] = sa

    handle = raw.get("instagramHandle")
    if handle is not None:
        normalized_handle = _parse_instagram_handle(handle)
        if normalized_handle is not None:
            out["instagramHandle"] = normalized_handle

    for key in ("websiteUrl", "reservationUrl", "onlineOrderUrl", "menuUrl", "googleMapsUrl"):
        raw_value = raw.get(key)
        if raw_value is None:
            continue
        url = _parse_url(raw_value, field_label=key)
        if url is not None:
            out[key] = url

    phone = raw.get("phone")
    if phone is not None:
        text = _parse_text(phone, field_label="phone", max_len=_MAX_PHONE_LEN)
        if text is not None:
            out["phone"] = text

    email = raw.get("contactEmail")
    if email is not None:
        normalized_email = _parse_email(email)
        if normalized_email is not None:
            out["contactEmail"] = normalized_email

    neighborhood = raw.get("neighborhood")
    if neighborhood is not None:
        text = _parse_text(neighborhood, field_label="neighborhood", max_len=_MAX_NEIGHBORHOOD_LEN)
        if text is not None:
            out["neighborhood"] = text

    value_prop = raw.get("valueProposition")
    if value_prop is not None:
        text = _parse_text(
            value_prop,
            field_label="valueProposition",
            max_len=_MAX_VALUE_PROPOSITION_LEN,
        )
        if text is not None:
            out["valueProposition"] = text

    about_story = raw.get("aboutStory")
    if about_story is not None:
        text = _parse_text(about_story, field_label="aboutStory", max_len=_MAX_ABOUT_STORY_LEN)
        if text is not None:
            out["aboutStory"] = text

    topics_to_avoid = raw.get("topicsToAvoid")
    if topics_to_avoid is not None:
        text = _parse_text(
            topics_to_avoid,
            field_label="topicsToAvoid",
            max_len=_MAX_TOPICS_TO_AVOID_LEN,
        )
        if text is not None:
            out["topicsToAvoid"] = text

    return out


def is_quick_profile_empty(profile: dict[str, Any]) -> bool:
    """Return True when the stored profile has no meaningful owner-provided data.

    Default-off ``videoComfort`` and default-off ``servesAlcohol`` (or any combination
    of those two booleans alone, all set to ``False``) are not meaningful state and
    are treated as empty so the stored row is removed.
    """
    if not profile:
        return True
    sentinel_only = {"videoComfort", "servesAlcohol"}
    if not (set(profile.keys()) <= sentinel_only):
        return False
    return all(profile.get(key) in (False, None) for key in profile)
