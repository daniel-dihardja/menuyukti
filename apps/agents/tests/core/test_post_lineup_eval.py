"""Tests for post_lineup deterministic eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.post_lineup_eval import (
    enrich_post_lineup_eval_payload,
    is_post_lineup_milestone_data,
    try_post_lineup_deterministic_verdict,
)


def _sample_data() -> dict:
    return {
        "posts": [
            {
                "id": "pinned-monthly-menu",
                "format": "carousel",
                "intent": "pinned_monthly_menu",
                "title": "Monthly top menu",
                "slides": [
                    {"dishName": "Ribeye", "imageBrief": "Hero steak photo"},
                    {"dishName": "Burger", "imageBrief": "Stacked burger photo"},
                ],
            }
        ]
    }


def test_is_post_lineup_milestone_data() -> None:
    assert is_post_lineup_milestone_data(_sample_data()) is True
    assert is_post_lineup_milestone_data({"groups": []}) is False


def test_enrich_post_lineup_eval_payload() -> None:
    enriched = enrich_post_lineup_eval_payload(_sample_data())
    assert enriched["_evalHints"]["postCount"] == 1
    assert enriched["_evalHints"]["slideCount"] == 2


def test_try_post_lineup_deterministic_verdict_prior_menu_clusterer() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Run used a prior menu_clusterer milestone with foodLeads.",
        _sample_data(),
    )
    assert verdict == (
        "pass",
        "post lineup produced 1 post concept(s) from menu clusterer food leads.",
    )


def test_try_post_lineup_deterministic_verdict_carousel() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "posts includes at least one carousel post concept.",
        _sample_data(),
    )
    assert verdict == ("pass", "post lineup includes 1 carousel post(s).")


def test_try_post_lineup_deterministic_verdict_slide_fields() -> None:
    verdict = try_post_lineup_deterministic_verdict(
        "Every slide has non-empty dishName and imageBrief.",
        _sample_data(),
    )
    assert verdict == ("pass", "every slide has non-empty dishName and imageBrief.")
