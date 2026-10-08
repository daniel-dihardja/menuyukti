"""Google Places API (New) helpers for geocode + nearby search."""

from __future__ import annotations

import logging
import math
import os
from typing import Any

import httpx

_logger = logging.getLogger(__name__)

_PLACES_BASE = "https://places.googleapis.com/v1"
_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.types,places.rating,places.googleMapsUri"
)
DEFAULT_RADIUS_M = 1200.0
MAX_PLACES_TOTAL = 25
MAX_PER_FOCUS = 10


class PlacesApiError(RuntimeError):
    """Raised when Google Places requests fail."""


def google_maps_api_key() -> str:
    key = (
        os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
        or os.environ.get("GOOGLE_API_KEY", "").strip()
    )
    if not key:
        msg = "GOOGLE_MAPS_API_KEY (or GOOGLE_API_KEY) must be set for Nearby Locations scans"
        raise PlacesApiError(msg)
    return key


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Great-circle distance in meters."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(round(2 * r * math.asin(math.sqrt(a))))


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": _FIELD_MASK,
    }


def _parse_place(raw: dict[str, Any]) -> dict[str, Any] | None:
    loc = raw.get("location") or {}
    lat = loc.get("latitude")
    lng = loc.get("longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return None
    display = raw.get("displayName") or {}
    name = display.get("text") if isinstance(display, dict) else None
    if not isinstance(name, str) or not name.strip():
        return None
    place_id = raw.get("id")
    if isinstance(place_id, str) and place_id.startswith("places/"):
        place_id = place_id.removeprefix("places/")
    types = raw.get("types") if isinstance(raw.get("types"), list) else []
    rating = raw.get("rating")
    return {
        "placeId": place_id if isinstance(place_id, str) else None,
        "name": name.strip(),
        "lat": float(lat),
        "lng": float(lng),
        "types": [t for t in types if isinstance(t, str)],
        "rating": float(rating) if isinstance(rating, (int, float)) else None,
        "address": raw.get("formattedAddress")
        if isinstance(raw.get("formattedAddress"), str)
        else None,
        "googleMapsUri": raw.get("googleMapsUri")
        if isinstance(raw.get("googleMapsUri"), str)
        else None,
    }


async def search_text(
    client: httpx.AsyncClient,
    *,
    text_query: str,
    max_result_count: int = 5,
    api_key: str | None = None,
) -> list[dict[str, Any]]:
    key = api_key or google_maps_api_key()
    payload = {
        "textQuery": text_query.strip(),
        "maxResultCount": max(1, min(max_result_count, 20)),
    }
    response = await client.post(
        f"{_PLACES_BASE}/places:searchText",
        headers=_headers(key),
        json=payload,
        timeout=30.0,
    )
    if response.status_code >= 400:
        _logger.error("places searchText failed: %s %s", response.status_code, response.text[:500])
        raise PlacesApiError(f"Places text search failed ({response.status_code})")
    data = response.json()
    places = data.get("places") if isinstance(data, dict) else None
    if not isinstance(places, list):
        return []
    out: list[dict[str, Any]] = []
    for raw in places:
        if isinstance(raw, dict):
            parsed = _parse_place(raw)
            if parsed:
                out.append(parsed)
    return out


async def geocode_address(
    client: httpx.AsyncClient,
    *,
    address: str,
    api_key: str | None = None,
) -> dict[str, Any]:
    results = await search_text(client, text_query=address, max_result_count=1, api_key=api_key)
    if not results:
        raise PlacesApiError(f"Could not geocode address: {address!r}")
    return results[0]


async def search_nearby(
    client: httpx.AsyncClient,
    *,
    lat: float,
    lng: float,
    included_types: list[str],
    radius_m: float = DEFAULT_RADIUS_M,
    max_result_count: int = MAX_PER_FOCUS,
    api_key: str | None = None,
) -> list[dict[str, Any]]:
    key = api_key or google_maps_api_key()
    payload: dict[str, Any] = {
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(radius_m),
            }
        },
        "maxResultCount": max(1, min(max_result_count, 20)),
    }
    if included_types:
        payload["includedTypes"] = included_types[:5]
    response = await client.post(
        f"{_PLACES_BASE}/places:searchNearby",
        headers=_headers(key),
        json=payload,
        timeout=30.0,
    )
    if response.status_code >= 400:
        _logger.error(
            "places searchNearby failed: %s %s", response.status_code, response.text[:500]
        )
        raise PlacesApiError(f"Places nearby search failed ({response.status_code})")
    data = response.json()
    places = data.get("places") if isinstance(data, dict) else None
    if not isinstance(places, list):
        return []
    out: list[dict[str, Any]] = []
    for raw in places:
        if isinstance(raw, dict):
            parsed = _parse_place(raw)
            if parsed:
                out.append(parsed)
    return out
