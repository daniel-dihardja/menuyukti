"""Tests for post_lineup deterministic eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.post_lineup_eval import (
    enrich_post_lineup_eval_payload,
    try_post_lineup_deterministic_verdict,
)

START_DATE = "2026-06-01"
END_DATE = "2026-06-30"


def _weekly_post(date: str, title: str) -> dict:
    return {
        "id": f"weekday-lunch-post-week-{date}",
        "format": "carousel",
        "intent": "weekday_lunch_post",
        "title": title,
        "groupIds": ["group-1"],
        "date": date,
        "fixdate": True,
        "scheduleHints": {
            "preferredWeekdays": ["tuesday"],
            "preferredTime": "10:00",
        },
        "slides": [{"dishName": "Ribeye", "imageBrief": "Lunch photo brief."}],
    }


def _sample_data() -> dict:
    return {
        "startDate": START_DATE,
        "endDate": END_DATE,
        "sourceDatesTitle": "Campaign dates",
        "posts": [
            {
                "id": "pinned-monthly-menu",
                "format": "carousel",
                "intent": "pinned_monthly_menu",
                "title": "Cafe Alto signature menu",
                "groupIds": ["group-1", "group-2"],
                "slides": [
                    {"dishName": "Ribeye", "imageBrief": "Hero photo brief."},
                    {"dishName": "Burger", "imageBrief": "Stack photo brief."},
                ],
            },
            _weekly_post("2026-06-02", "Week 1 lunch"),
            _weekly_post("2026-06-09", "Week 2 lunch"),
            _weekly_post("2026-06-16", "Week 3 lunch"),
            _weekly_post("2026-06-23", "Week 4 lunch"),
            _weekly_post("2026-06-30", "Week 5 lunch"),
        ],
        "sourceMenuClustererTitle": "Menu clusterer",
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def test_enrich_post_lineup_eval_payload() -> None:
    enriched = enrich_post_lineup_eval_payload(_sample_data())
    assert enriched["_evalHints"]["postCount"] == 6
    assert enriched["_evalHints"]["expectedWeeklyPostCount"] == 5


def test_try_post_lineup_deterministic_verdict_dates_prior() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior dates milestone with saved start and end dates.",
        _sample_data(),
    )
    assert verdict == ("pass", "post lineup used prior dates milestone for the campaign window.")


def test_try_post_lineup_deterministic_verdict_campaign_brief_prior() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior restaurant_campaign_brief milestone for location context.",
        _sample_data(),
    )
    assert verdict == (
        "pass",
        "post lineup used prior restaurant_campaign_brief context for post planning.",
    )


def test_try_post_lineup_deterministic_verdict_weekly_posts_per_week() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "posts includes one weekday_lunch_post carousel per week in the campaign window.",
        _sample_data(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_try_post_lineup_deterministic_verdict_weekly_fixdate() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Each weekday_lunch_post has fixdate true and a date within the campaign window.",
        _sample_data(),
    )
    assert verdict == (
        "pass",
        "every weekday lunch post has fixdate true and a valid date.",
    )


def test_try_post_lineup_deterministic_verdict_slide_fields() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Every slide has non-empty dishName and imageBrief.",
        _sample_data(),
    )
    assert verdict == ("pass", "every slide has non-empty dishName and imageBrief.")
