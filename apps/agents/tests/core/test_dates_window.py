"""Tests for campaign window week enumeration."""

from __future__ import annotations

from agents_app.agents.core.milestone_run.dates_window import (
    campaign_weeks,
    count_campaign_weeks,
    preferred_weekdays_for_strategy,
)


def test_campaign_weeks_june_2026_window() -> None:
    weeks = campaign_weeks("2026-06-01", "2026-06-30")
    assert len(weeks) == 5
    assert weeks[0].week_index == 1
    assert weeks[0].week_start == "2026-06-01"
    assert weeks[0].post_date == "2026-06-02"
    assert weeks[-1].week_start == "2026-06-29"
    assert weeks[-1].post_date == "2026-06-30"


def test_campaign_weeks_partial_first_week() -> None:
    weeks = campaign_weeks("2026-06-04", "2026-06-10")
    assert len(weeks) == 1
    assert weeks[0].post_date == "2026-06-09"


def test_campaign_weeks_weekend_family_strategy() -> None:
    brief = {"overallStrategy": {"strategyFocus": "weekend_family"}}
    weeks = campaign_weeks("2026-06-01", "2026-06-07", campaign_brief_data=brief)
    assert len(weeks) == 1
    assert weeks[0].post_date == "2026-06-05"
    assert preferred_weekdays_for_strategy(brief) == ["friday", "sunday"]


def test_count_campaign_weeks_matches_list_length() -> None:
    start = "2026-06-01"
    end = "2026-06-30"
    assert count_campaign_weeks(start, end) == len(campaign_weeks(start, end))
