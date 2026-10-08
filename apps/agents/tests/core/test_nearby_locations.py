"""Unit tests for Nearby Locations focus mapping and distance helper."""

from __future__ import annotations

from agents_app.agents.core.nearby_locations.focus_queries import (
    default_kind_for_focus,
    included_types_for_focus,
    text_query_for_focus,
)
from agents_app.agents.core.nearby_locations.places_client import haversine_meters


def test_included_types_for_competitors() -> None:
    types = included_types_for_focus("competitors")
    assert "restaurant" in types
    assert default_kind_for_focus("competitors") == "competitor"


def test_included_types_for_lunch_demand() -> None:
    types = included_types_for_focus("lunch_demand")
    assert "corporate_office" in types or "office" in types
    assert default_kind_for_focus("lunch_demand") == "demand"


def test_text_query_includes_address() -> None:
    q = text_query_for_focus("schools", "Berlin Mitte")
    assert "Berlin Mitte" in q
    assert "school" in q.lower() or "schools" in q.lower()


def test_haversine_same_point_is_zero() -> None:
    assert haversine_meters(52.52, 13.405, 52.52, 13.405) == 0


def test_haversine_known_distance_order() -> None:
    # ~1.1km between nearby Berlin points
    dist = haversine_meters(52.52, 13.405, 52.53, 13.405)
    assert 900 < dist < 1400
