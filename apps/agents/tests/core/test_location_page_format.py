"""Tests for location-page Markdown formatters."""

from __future__ import annotations

from agents_app.agents.core.location_page_format import (
    fmt_opening_hours,
    format_location_page_markdown,
)


def test_fmt_opening_hours_open_and_closed_days() -> None:
    raw_loc = {
        "openingHours": [
            {"dayOfWeek": "monday", "openTime": "09:00", "closeTime": "21:00"},
            {"dayOfWeek": "tuesday", "openTime": "", "closeTime": ""},
            {"dayOfWeek": "wednesday", "openTime": "10:00", "closeTime": "22:00"},
        ],
    }
    out = fmt_opening_hours(raw_loc)
    assert "**monday**: 09:00–21:00" in out
    assert "**tuesday**: closed" in out
    assert "**wednesday**: 10:00–22:00" in out
    assert "**sunday**: closed" in out


def test_fmt_opening_hours_empty_list() -> None:
    out = fmt_opening_hours({"openingHours": []})
    assert "not set" in out.lower()


def test_format_location_page_markdown_includes_basics_hours_and_profile() -> None:
    raw_loc = {
        "name": "Test Bistro",
        "street": "1 Main St",
        "city": "Berlin",
        "country": "DE",
        "currency": "EUR",
        "openingHours": [
            {"dayOfWeek": "monday", "openTime": "11:00", "closeTime": "23:00"},
        ],
        "manualBriefInput": {
            "locationId": 7,
            "quickProfile": {
                "cuisineTypes": ["Italian"],
            },
        },
    }
    out = format_location_page_markdown(raw_loc)
    assert "## Location basics" in out
    assert "**Name**: Test Bistro" in out
    assert "## Opening hours" in out
    assert "**monday**: 11:00–23:00" in out
    assert "## Owner-provided brief hints" in out
    assert "**Cuisine types**: Italian" in out
