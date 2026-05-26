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
                "strategyFocus": "weekday_lunch",
                "scheduleHints": {
                    "preferredWeekdays": ["tuesday"],
                    "preferredTime": "11:00",
                    "cadenceEligible": True,
                },
            }
        ],
        "drinkGroups": [],
        "unassignedItemNames": ["Burger"],
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def _drink_group(name: str = "Cola", *, storytelling: str = "weak") -> dict:
    return {
        "id": "drink-group-1",
        "leadName": name,
        "profileId": "hook_reel",
        "anchor": {"dimension": "reel_moment", "value": "pour"},
        "items": [
            {
                "name": name,
                "role": "star",
                "category": "DRINKS",
                "position": 1,
                "storytellingFit": storytelling,
                "reelMoment": "pour",
            },
        ],
        "mix": {
            "priceLevels": [],
            "storytellingStrongCount": 0,
            "starCount": 1,
            "puzzleCount": 0,
        },
    }


def test_enrich_reel_lineup_eval_payload_adds_hints() -> None:
    enriched = enrich_reel_lineup_eval_payload(_sample_payload())
    assert enriched["_evalHints"]["maxLeadGroups"] == 5
    assert enriched["_evalHints"]["maxDrinkLeadGroups"] == 3


def test_prior_menu_tagger_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Run used a prior menu_tagger milestone with tagged items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_prior_menu_tagger_verdict_passes_with_drink_only() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Run used a prior menu_tagger milestone with tagged items.",
        {"groups": [], "drinkGroups": [_drink_group()], "unassignedItemNames": []},
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_food_hook_group_count_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Data includes up to 5 food Reel hook groups.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_campaign_brief_strategy_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Data references a prior campaign brief and carries campaign-aware scheduling hints.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_schedule_hints_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Each food group includes strategy focus plus preferred weekday and time schedule hints.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_drink_hook_group_count_verdict_passes() -> None:
    payload = _sample_payload()
    payload["drinkGroups"] = [_drink_group()]
    verdict = try_reel_lineup_deterministic_verdict(
        "Data includes up to 3 drink Reel hook groups.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_main_course_hook_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Each food group's position-1 item is a main-course food item with strong storytelling.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_drink_hook_verdict_passes_with_weak_storytelling() -> None:
    payload = _sample_payload()
    payload["drinkGroups"] = [_drink_group(storytelling="weak")]
    verdict = try_reel_lineup_deterministic_verdict(
        "Each drink group's position-1 item is a tagged beverage drink with a reel moment "
        "(storytelling fit not required).",
        payload,
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
        "Each food group's position-1 item is a main-course food item with strong storytelling.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"
