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
                        "reelMoment": "sizzle",
                    },
                    {
                        "name": "Burger",
                        "role": "star",
                        "category": "MAINS",
                        "position": 2,
                        "reelMoment": "sizzle",
                    },
                    {
                        "name": "Wings",
                        "role": "puzzle",
                        "category": "MAINS",
                        "position": 3,
                        "reelMoment": "sizzle",
                    },
                ],
                "mix": {
                    "priceLevels": [3, 2, 2],
                    "storytellingStrongCount": 1,
                    "starCount": 2,
                    "puzzleCount": 1,
                },
            }
        ],
        "unassignedItemNames": [],
    }


def test_enrich_reel_lineup_eval_payload_adds_hints() -> None:
    enriched = enrich_reel_lineup_eval_payload(_sample_payload())
    assert enriched["_evalHints"]["sharedAnchorDimension"] == "reel_moment"


def test_group_size_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Each group contains 3–5 menu items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_star_lead_verdict_passes() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Each group starts with a star item as the Reel hook.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_shared_reel_moment_verdict_passes_with_drink_last() -> None:
    payload = _sample_payload()
    payload["groups"][0]["items"].append(
        {
            "name": "Cola",
            "role": "star",
            "category": "DRINK",
            "position": 4,
            "reelMoment": "pour",
        }
    )
    verdict = try_reel_lineup_deterministic_verdict(
        "Food items within each group share the same reel_moment anchor tag.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_drink_end_verdict_passes() -> None:
    payload = _sample_payload()
    payload["groups"][0]["items"].append(
        {
            "name": "Cola",
            "role": "star",
            "category": "DRINK",
            "position": 4,
            "reelMoment": "pour",
        }
    )
    verdict = try_reel_lineup_deterministic_verdict(
        "Each group ends with a drink menu item when drinks are present in Menu Tagger data.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_drink_end_verdict_passes_when_no_drinks() -> None:
    verdict = try_reel_lineup_deterministic_verdict(
        "Each group ends with a drink menu item when drinks are present in Menu Tagger data.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
