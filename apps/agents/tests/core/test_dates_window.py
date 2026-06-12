"""Tests for campaign window week enumeration."""

from __future__ import annotations

from agents_app.agents.core.milestone_run.dates_window import (
    campaign_days_in_week_overlap,
    campaign_weeks,
    count_campaign_weeks,
    holiday_dates,
    interval_block_starts,
    pick_least_busy_date,
    preferred_weekdays_for_strategy,
    schedule_hints_for_reel_intent,
    week_has_weekend_in_overlap,
    week_requires_weekly_cadence,
)


def test_campaign_weeks_june_2026_window() -> None:
    weeks = campaign_weeks("2026-06-01", "2026-06-30")
    assert len(weeks) == 4
    assert weeks[0].week_index == 1
    assert weeks[0].week_start == "2026-06-01"
    assert weeks[0].post_date == "2026-06-04"
    assert weeks[-1].week_start == "2026-06-22"
    assert weeks[-1].post_date == "2026-06-25"


def test_campaign_weeks_partial_first_week() -> None:
    weeks = campaign_weeks("2026-06-04", "2026-06-10")
    assert len(weeks) == 1
    assert weeks[0].post_date == "2026-06-04"


def test_short_tail_week_overlap_is_not_schedulable() -> None:
    start = "2026-06-01"
    end = "2026-06-23"
    assert campaign_days_in_week_overlap("2026-06-22", "2026-06-23", start, end) == 2
    assert not week_requires_weekly_cadence("2026-06-22", "2026-06-23", start, end)


def test_tail_week_ending_thursday_has_no_weekend_in_overlap() -> None:
    weeks = campaign_weeks("2026-06-01", "2026-06-25")
    tail = weeks[-1]
    assert tail.week_end == "2026-06-25"
    assert not week_has_weekend_in_overlap(
        tail.week_start,
        tail.week_end,
        "2026-06-01",
        "2026-06-25",
    )


def test_campaign_weeks_weekend_family_strategy() -> None:
    brief = {"overallStrategy": {"strategyFocus": "weekend_family"}}
    weeks = campaign_weeks("2026-06-01", "2026-06-07", campaign_brief_data=brief)
    assert len(weeks) == 1
    assert weeks[0].post_date == "2026-06-05"
    assert preferred_weekdays_for_strategy(brief) == ["friday", "sunday"]


def test_schedule_hints_for_reel_intent_weekday_vs_weekend() -> None:
    brief = {"overallStrategy": {"strategyFocus": "weekday_lunch"}}
    weekday = schedule_hints_for_reel_intent("weekday_reel", brief)
    weekend = schedule_hints_for_reel_intent("weekend_reel", brief)
    assert weekday["preferredWeekdays"] == ["thursday"]
    assert weekday["preferredTime"] == "11:00"
    assert weekend["preferredWeekdays"] == ["saturday", "sunday"]
    assert weekend["preferredTime"] == "11:00"


def test_count_campaign_weeks_matches_list_length() -> None:
    start = "2026-06-01"
    end = "2026-06-30"
    assert count_campaign_weeks(start, end) == len(campaign_weeks(start, end))


def test_holiday_dates_extracts_iso_dates() -> None:
    dates = holiday_dates(
        [
            {"date": "2026-06-15", "name": "Easter Sunday"},
            {"date": "invalid", "name": "Skip"},
        ]
    )
    assert dates == {"2026-06-15"}


def test_interval_block_starts_four_week_blocks() -> None:
    blocks = interval_block_starts("2026-06-01", "2026-06-30", interval_weeks=4)
    assert blocks == [("2026-06-01", "2026-06-28")]

    long_blocks = interval_block_starts("2026-06-01", "2026-08-31", interval_weeks=4)
    assert len(long_blocks) == 3
    assert long_blocks[0] == ("2026-06-01", "2026-06-28")
    assert long_blocks[1] == ("2026-06-29", "2026-07-26")
    assert long_blocks[2] == ("2026-07-27", "2026-08-23")


def test_pick_least_busy_date_prefers_wednesday_and_avoids_holidays() -> None:
    picked = pick_least_busy_date(
        "2026-06-01",
        "2026-06-30",
        occupied_counts={"2026-06-04": 1, "2026-06-11": 1},
        holiday_dates={"2026-06-15"},
    )
    assert picked == "2026-06-03"


def test_pick_least_busy_date_prefers_lower_traffic_among_same_weekday() -> None:
    picked = pick_least_busy_date(
        "2026-06-01",
        "2026-06-30",
        occupied_counts={"2026-06-03": 2, "2026-06-10": 0, "2026-06-17": 1},
        holiday_dates=set(),
    )
    assert picked == "2026-06-10"
