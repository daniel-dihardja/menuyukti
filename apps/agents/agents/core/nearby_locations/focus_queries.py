"""Map focus chips to Google Places includedTypes and default node kinds."""

from __future__ import annotations

from agents_app.agents.core.nearby_locations.models import NearbyFocusId, NearbyNodeKind

# Places API (New) type tokens — see https://developers.google.com/maps/documentation/places/web-service/place-types
_FOCUS_TYPES: dict[NearbyFocusId, tuple[str, ...]] = {
    "lunch_demand": ("corporate_office", "office", "coworking_space", "university"),
    "competitors": ("restaurant", "cafe", "meal_takeaway", "meal_delivery"),
    "schools": ("school", "primary_school", "secondary_school", "university"),
    "hotels": ("lodging", "hotel", "extended_stay_hotel"),
}

_FOCUS_KIND: dict[NearbyFocusId, NearbyNodeKind] = {
    "lunch_demand": "demand",
    "competitors": "competitor",
    "schools": "demand",
    "hotels": "demand",
}

_FOCUS_TEXT_FALLBACK: dict[NearbyFocusId, str] = {
    "lunch_demand": "office buildings near",
    "competitors": "restaurants near",
    "schools": "schools near",
    "hotels": "hotels near",
}


def included_types_for_focus(focus: NearbyFocusId) -> list[str]:
    return list(_FOCUS_TYPES[focus])


def default_kind_for_focus(focus: NearbyFocusId) -> NearbyNodeKind:
    return _FOCUS_KIND[focus]


def text_query_for_focus(focus: NearbyFocusId, address: str) -> str:
    return f"{_FOCUS_TEXT_FALLBACK[focus]} {address}".strip()
