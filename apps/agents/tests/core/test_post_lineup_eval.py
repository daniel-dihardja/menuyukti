"""Tests for post_lineup deterministic eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.post_lineup_eval import (
    enrich_post_lineup_eval_payload,
    try_post_lineup_deterministic_verdict,
)


def _sample_data() -> dict:
    return {
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
            {
                "id": "weekday-lunch-post",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Weekday lunch at Cafe Alto",
                "groupIds": ["group-1"],
                "scheduleHints": {
                    "preferredWeekdays": ["tuesday"],
                    "preferredTime": "10:00",
                },
                "slides": [{"dishName": "Ribeye", "imageBrief": "Lunch photo brief."}],
            },
        ],
        "sourceMenuClustererTitle": "Menu clusterer",
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def test_enrich_post_lineup_eval_payload() -> None:
    enriched = enrich_post_lineup_eval_payload(_sample_data())
    assert enriched["_evalHints"]["postCount"] == 2
    assert enriched["_evalHints"]["intents"] == ["pinned_monthly_menu", "weekday_lunch_post"]


def test_try_post_lineup_deterministic_verdict_campaign_brief_prior() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior restaurant_campaign_brief milestone for location context.",
        _sample_data(),
    )
    assert verdict == ("pass", "post lineup used prior restaurant_campaign_brief context for post planning.")


def test_try_post_lineup_deterministic_verdict_two_carousel_posts() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "posts includes two carousel post concepts: pinned_monthly_menu and weekday_lunch_post.",
        _sample_data(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_try_post_lineup_deterministic_verdict_slide_fields() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Every slide has non-empty dishName and imageBrief.",
        _sample_data(),
    )
    assert verdict == ("pass", "every slide has non-empty dishName and imageBrief.")
