"""Tests for post_lineup deterministic eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.post_lineup_eval import (
    enrich_post_lineup_eval_payload,
    try_post_lineup_deterministic_verdict,
)

START_DATE = "2026-06-01"
END_DATE = "2026-06-30"


def _top_five_post() -> dict:
    return {
        "id": "top-five-mains",
        "format": "carousel",
        "intent": "top_five_category",
        "title": "Top 5 MAINS",
        "category": "MAINS",
        "intervalWeeks": 2,
        "fixdate": False,
        "slides": [
            {
                "dishName": "Ribeye",
                "imageBrief": "Hero photo brief.",
                "caption": "Ribeye caption.",
            },
            {
                "dishName": "Burger",
                "imageBrief": "Stack photo brief.",
                "caption": "Burger caption.",
            },
        ],
    }


def _sample_data() -> dict:
    return {
        "startDate": START_DATE,
        "endDate": END_DATE,
        "sourceDatesTitle": "Campaign dates",
        "posts": [_top_five_post()],
        "sourceMenuTaggerTitle": "Menu tagger",
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def test_enrich_post_lineup_eval_payload() -> None:
    enriched = enrich_post_lineup_eval_payload(_sample_data())
    assert enriched["_evalHints"]["postCount"] == 1
    assert enriched["_evalHints"]["topFivePostCount"] == 1


def test_try_post_lineup_deterministic_verdict_dates_prior() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior dates milestone with saved start and end dates.",
        _sample_data(),
    )
    assert verdict == ("pass", "post lineup used prior dates milestone for the campaign window.")


def test_try_post_lineup_deterministic_verdict_menu_tagger_prior() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior menu_tagger milestone with tagged items.",
        _sample_data(),
    )
    assert verdict == (
        "pass",
        "post lineup used prior menu_tagger milestone for Top 5 category posts.",
    )


def test_try_post_lineup_deterministic_verdict_carousel_posts() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "posts includes one top_five_category carousel per star category (when present).",
        _sample_data(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_try_post_lineup_deterministic_verdict_legacy_menu_clusterer_criterion() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior menu_clusterer milestone with groups.",
        _sample_data(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
    assert "menu tagger" in verdict[1].lower()


def test_try_post_lineup_deterministic_verdict_slide_fields() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Every slide has non-empty dishName and imageBrief; top_five_category slides also have non-empty caption.",
        _sample_data(),
    )
    assert verdict == (
        "pass",
        "every slide has non-empty dishName, imageBrief, and top_five_category slides have caption.",
    )
