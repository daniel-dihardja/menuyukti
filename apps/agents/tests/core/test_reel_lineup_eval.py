"""Tests for deterministic reel_lineup milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.reel_lineup_eval import (
    enrich_reel_lineup_eval_payload,
    try_reel_lineup_deterministic_verdict,
)


def _sample_payload() -> dict:
    return {
        "groups": [
            {
                "id": "group-1",
                "leadName": "Ribeye",
                "profileId": "hook_reel",
                "anchor": {"dimension": "reel_moment", "value": "sizzle"},
                "items": [
                    {
                        "name": "Ribeye",
                        "role": "star",
                        "category": "MAINS",
                        "position": 1,
                        "storytellingFit": "strong",
                        "reelMoment": "sizzle",
                    },
                ],
                "mix": {
                    "priceLevels": [],
                    "storytellingStrongCount": 1,
                    "starCount": 1,
                    "puzzleCount": 0,
                },
            }
        ],
        "unassignedItemNames": ["Burger"],
    }


def test_enrich_reel_lineup_eval_payload_adds_hints() -> None:
    enriched = enrich_reel_lineup_eval_payload(_sample_payload())
    assert enriched["_evalHints"]["maxLeadGroups"] == 5


def test_prior_menu_tagger_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Run used a prior menu_tagger milestone with tagged items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_hook_group_count_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Data includes up to 5 Reel hook groups.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_main_course_hook_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Each group's position-1 item is a main-course food item with strong storytelling.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_main_course_hook_verdict_fails_when_multiple_items() -> None:
    payload = _sample_payload()
    payload["groups"][0]["items"].append(
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "position": 2,
            "storytellingFit": "strong",
            "reelMoment": "sizzle",
        }
    )
    verdict = try_reel_lineup_deterministic_verdict(
        "Each group's position-1 item is a main-course food item with strong storytelling.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"
