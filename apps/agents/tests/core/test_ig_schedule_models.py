"""Tests for shared staged IG schedule parse helpers."""

from __future__ import annotations

import pytest
from agents_app.agents.core.milestone_run.ig_schedule import (
    parse_ig_menu_picker_schedule,
    parse_ig_plan_schedule,
    try_parse_ig_menu_picker_schedule,
    try_parse_ig_plan_schedule,
)
from pydantic import ValidationError


def _plan_entry() -> dict:
    return {
        "day": "wednesday",
        "slot": "14:30",
        "objective": "Increase afternoon traffic",
        "pillar": "hero",
        "mealPeriod": "afternoon",
        "productRole": "puzzle",
        "slotStrategy": "aggressively_grow",
        "slotKey": "wednesday-afternoon",
    }


def _plan_payload() -> dict:
    return {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [_plan_entry()],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }


def test_parse_ig_plan_schedule_accepts_valid_payload() -> None:
    parsed = parse_ig_plan_schedule(_plan_payload())
    assert len(parsed.entries) == 1
    assert parsed.entries[0].slotKey == "wednesday-afternoon"


def test_parse_ig_menu_picker_rejects_plan_only_payload() -> None:
    with pytest.raises(ValidationError):
        parse_ig_menu_picker_schedule(_plan_payload())
    assert try_parse_ig_menu_picker_schedule(_plan_payload()) is None


def test_try_parse_ig_plan_schedule_rejects_invalid_slot() -> None:
    bad = _plan_payload()
    bad["entries"][0]["slot"] = "2pm"
    assert try_parse_ig_plan_schedule(bad) is None
